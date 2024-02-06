require('dotenv').config();
const { OpenAI } = require('openai')
const openai = new OpenAI();


async function createAssistant(name, instruction) {
    const assistant = await openai.beta.assistants.create({
        name: name,
        instructions: instruction,
        tools: [{ type: "code_interpreter" }],
        model: "gpt-4-1106-preview"
    });

    return assistant
}

async function runAssistant(assistantId, threadId) {
    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id:assistantId
    });

    while (true) {
        const status = (await openai.beta.threads.runs.retrieve(threadId, run.id)).status;

        if (status == 'completed') {
            break
        } else if (status.includes([ "cancelling", "cancelled", "failed", "expired"])) {
            throw new Error('Run did not complete properly with status: ' + status);
        }

        await new Promise(r => setTimeout(r, 1500));
    }

    const messages = (await openai.beta.threads.messages.list(threadId)).data

    return messages.filter((message=> message.run_id == run.id && message.role == 'assistant')).pop()
}

module.exports = { createAssistant, runAssistant }