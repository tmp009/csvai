require('dotenv').config();

const path = require('path');
const express = require('express');

const { OpenAI, toFile } = require('openai');
const openai = new OpenAI();

const { createAssistant, runAssistant } = require('./assistant');

async function perform(message, csv) {
  const messages = [
    {
      role: 'system', content: 'Always return the data as a JSON array in a object with the key "data". If the question or task is vague or not a query for the CSV then return the reason as key "error" and always keep key "data" as an empty array.'
    },
    {
      role: 'system', content: 'You will be given CSV data and the user will ask you to something with it.'
    },
    { role: 'user', content: csv },
    { role: 'user', content: message }
  ]

  const completion = await openai.chat.completions.create({
    messages,
    model: "gpt-4-1106-preview",
    response_format: { type: 'json_object' }
  })

  return JSON.parse(completion.choices[0].message.content)
}

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send("CSVAI\n");
});

app.post('/query', async (req, res) => {
  const csv = req.body.csv;
  if (!csv) {
    return res.status(400).json({ error: "Missing required parameter: csv" })
  }
  const prompt = req.body.prompt;
  if (!prompt) {
    return res.status(400).json({ error: "Missing required parameter: prompt" })
  }

  const answer = await perform(csv, prompt);

  if (answer.error) {
    return res.status(400).json({ error: answer.error })
  } else {
    return res.json(answer.data);
  }
});

app.post('/thread/new', async (req, res) => {
  const csv = req.body.csv;

  const file = await openai.files.create({
    file: await toFile(Buffer.from(csv), 'data.csv') ,
    purpose: "assistants"
  });

  if (!csv) {
    return res.status(400).json({ error: "Missing required parameter: csv" });
  }

  const assistant = await createAssistant('CSVAI', 'You are a assistant that handles CSV data. Answer questions related to CSV data using code interpreter.', file.id);
                    
  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: 'user', content: 'Always return the data as a JSON array in a object with the key "data". If the question or task is vague or not a query for the CSV then return the reason as key "error" and always keep key "data" as an empty array.',
      }
    ]
  });

  return res.json({threadId: thread.id.replace('thread_', ''), assistantId: assistant.id.replace('asst_', '')})
});

app.post('/assistant/:assistantId/thread/:threadId/query', async (req, res) => {
  const assistantId = 'asst_' + req.params.assistantId;
  const threadId = 'thread_' + req.params.threadId;
  const prompt = req.body.prompt;

  if (!prompt) {
    return res.status(400).json({ error: "Missing required parameter: prompt" })
  }

  try {
    await openai.beta.threads.messages.create(threadId, {
        role:'user',
        content:prompt
    })
      
    await runAssistant(assistantId, threadId);

    return res.json({ status: 200 });

  } catch (error) {
    if (error.status == 404) {
      return res.status(404).json({ error: `Failed to query thread: ${error.message}`})
    } else {
      console.log(error)
      return res.status(500).json({ error: `Failed to query thread due to an error`})
    }
  }

})

app.get('/thread/:threadId', async (req, res) => {
  const threadId = 'thread_' + req.params.threadId;

  const messages = (await openai.beta.threads.messages.list(threadId)).data

  if (!messages[0].assistant_id) {
    return res.status(409).json({ error: 'A run is currently being started' })
  }

  const lastMessage = messages.filter((message=> message.role == 'assistant'))[0]

  const run = await openai.beta.threads.runs.retrieve(threadId, lastMessage.run_id);

  if (run.status == 'completed') {
    const start = lastMessage.content[0].text.value.indexOf('{');
    const end = lastMessage.content[0].text.value.lastIndexOf('}') + 1;

    const cleanedData = lastMessage.content[0].text.value.substring(start, end)

    try {
      return res.json(JSON.parse(cleanedData))
    } catch {
    return res.status(500).json({ error: 'The run did not return json data' })
    }

  } else if (run.status == 'in_progress') {
    return res.status(409).json({ error: 'A run is in progress' })
  } else {
    return res.status(500).json({ error: 'Run did not complete properly with status: ' + run.status })
  }
})

app.delete('/thread/:threadId/', async (req, res) => {
  const threadId = 'thread_' + req.params.threadId;

  await openai.beta.threads.del(threadId) 
    .then(()=> res.json({ status: 200 }))
    .catch(error => { res.status(error.status).json({ error: `Failed to delete thread: ${error.message}`}) })
})

app.delete('/assistant/:assistantId/', async (req, res) => {
  const assistantId = 'asst_' + req.params.assistantId;

  try {
    await openai.files.del((await openai.beta.assistants.retrieve(assistantId)).file_ids[0]);
    await openai.beta.assistants.del(assistantId);
    res.json({ status: 200 })
  } catch (error) {
    res.status(error.status).json({ error: `Failed to delete assistant: ${error.message}`})
  }
})

app.listen(3000, 'localhost', () => console.log('http://0.0.0.0:3000/'))
