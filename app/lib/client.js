class Client {
  constructor(endpointUrl) {
    this.endpointUrl = endpointUrl;
  }

  async query(csv, prompt) {
    const resp = await fetch(this.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        csv: csv,
        prompt: prompt
      })
    });
    return await resp.json();
  }
}

module.exports = Client;
