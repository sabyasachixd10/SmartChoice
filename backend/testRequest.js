const axios = require('axios');
async function run() {
  try {
    const res = await axios.post('http://localhost:8080/api/rag/query', {
      query: "Which product has the most fiber?",
      topK: 5
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch(e) {
    console.error(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
  }
}
run();
