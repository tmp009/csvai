const fs = require('fs');

const Client = require('./lib/client');
const endpointUrl = process.argv[2]
const client = new Client(endpointUrl);

const csvPath = process.argv[3]
const csv = fs.readFileSync(csvPath, { 'encoding': 'utf8' })

const prompt = process.argv[4]

const main = async (prompt) => {
  await client.query(csv, prompt).then((obj) => {
    console.log(obj)
  })
}

main(prompt);
