const fs = require('fs');
const assert = require('assert')
const Client = require('./lib/client');


const endpointUrl = 'http://localhost:3000/query'
const client = new Client(endpointUrl);

const csv = fs.readFileSync('examples/hiking.csv', { 'encoding': 'utf8' })

async function test(prompt, f, expected) {
  console.log(`Testing '${prompt}'`)

  const obj = await client.query(csv, prompt)
  const answer = f(obj.data)

  try {
    assert.deepEqual(answer, expected)
    if (obj.error) {
      console.log(obj.error)
    }
  } catch {
    console.error("Assertion failed")
    console.error("Expected", expected)
    console.error("Got", answer)
    process.exit(1)
  }
}

(async () => {
  await test('Hello world', (data) => {
    return data.length
  }, 0);

  await test('give me an orange item', (data) => {
    return data.length;
  }, 0);

  await test('Get 1 summer item', (data) => {
    return [data.length, data[0].name]
  }, [1, "Summer Beach Towel"]);

  await test('Give me a sundress', (data) => {
    return [data.length, data[0].name];
  }, [1, 'Floral Sundress']);

  await test('get item with the id 10', (data) => {
    return [data.length, data[0].id];
  }, [1, '10']);

  await test('Give me a dress that is size m', (data) => {
    return [data.length, data[0].name]
  }, [1, 'Floral Sundress']);

  await test('get the cheapest item for winter', (data) => {
    return [data.length, data[0].name]
  }, [1, 'Stainless Thermos']);

  await test("get items that have black color", (data) => {
    return [data.length, data[0].name]
  }, [1, "Summer Beach Towel"]);

  await test('give me winter items', (data) => {
    return data.length
  }, 4);

  await test('give me summer items', (data) => {
    return data.length
  }, 3);
})();
