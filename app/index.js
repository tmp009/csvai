require('dotenv').config();

const path = require('path');
const express = require('express');

const fs = require('fs')

const { OpenAI } = require('openai');
const openai = new OpenAI();

const assistantPath = './assistant.json'
const { createAssistant, runAssistant } = require('./assistant');

let assistantId;

if (!fs.existsSync(assistantPath)) {
  createAssistant('CSVAI', 'You are a assistant that handles CSV data. Answer questions related to CSV data.')
    .then(assistant => {
      fs.writeFileSync(assistantPath, JSON.stringify({ id: assistant.id }));
      assistantId = assistant.id;
  })
    .catch(console.log)

} else {
  assistantId = require(assistantPath).id
}

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

  if (!csv) {
    return res.status(400).json({ error: "Missing required parameter: csv" })
  }

  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: 'user', content: 'Always return the data as a JSON array in a object with the key "data". If the question or task is vague or not a query for the CSV then return the reason as key "error" and always keep key "data" as an empty array.',
      },
      {
        role: 'user', content: csv
      }
    ]
  });

  return res.json({threadId: thread.id.replace('thread_', '')})
});

app.post('/thread/:threadId/query', async (req, res) => {
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
      
    const resp = await runAssistant(assistantId, threadId);
  
    const cleanedData = resp.content[0].text.value.replace(/^[\s\S]*?```json/, '').replace(/\s*```$/, '')
    
    return res.json(JSON.parse(cleanedData))

  } catch (error) {
    if (error.status == 404) {
      return res.status(404).json({ error: `Failed to query thread: the thread does not exist`})
    } else {
      console.log(error)
      return res.status(500).json({ error: `Failed to query thread due to an error`})
    }
  }

})

app.delete('/thread/:threadId/', async (req, res) => {
  const threadId = 'thread_' + req.params.threadId;

  await openai.beta.threads.del(threadId) 
    .then(()=> res.json({status: 200}))
    .catch(error => { res.status(error.status).json({ error: `Failed to delete thread: ${error.message}`}) })
})

app.listen(3000, '0.0.0.0', () => console.log('http://0.0.0.0:3000/'))
