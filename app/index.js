require('dotenv').config();

const path = require('path');
const express = require('express');

const fs = require('fs')

const { OpenAI } = require('openai');
const openai = new OpenAI();

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

  return completion.choices[0].message.content
}

const app = express();
app.use(express.json()); // Used to parse JSON bodies

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

  return res.json(
    JSON.parse(answer)
  );
});

app.listen(3000, '0.0.0.0', () => console.log('http://0.0.0.0:3000/'))
