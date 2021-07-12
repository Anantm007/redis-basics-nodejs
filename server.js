const express = require('express');
const cors = require('cors');
const { default: axios } = require('axios');
const Redis = require('redis');

const app = express();

app.use(cors());

const redisClient = Redis.createClient();
const DEFAULT_EXPIRATION = 3600;

app.get('/photos', async (req, res) => {
  // Query param
  const albumId = req.query.albumId;

  // retrieve photos data from cache function
  const photos = await getOrSetCache(`photos?albumId=${albumId}`, async () => {
    // Callback which will be called in case data not found in redis
    const { data } = await axios.get(
      'https://jsonplaceholder.typicode.com/photos',
      { params: { albumId } }
    );

    return data;
  });

  // If cache hit, return photos
  res.json(photos);
});

app.get('/photos/:id', async (req, res) => {
  // retrieve photos data from cache function
  const photo = await getOrSetCache(`photos:${req.params.id}`, async () => {
    // Callback which will be called in case data not found in redis
    const { data } = await axios.get(
      `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
    );

    return data;
  });

  res.json(photo);
});

// Function to set cache values or retrieve values
function getOrSetCache(key, cb) {
  return new Promise((resolve, reject) => {
    // Check if data exists in cache or not
    redisClient.get(key, async (err, data) => {
      if (err) {
        return reject(err);
      }
      // If data was found in cache
      if (data != null) {
        return resolve(JSON.parse(data));
      }
      // if data was not found, invoke the callback to fetch data from the API
      const freshData = await cb();

      // Set the values in redis cache
      redisClient.setex(key, DEFAULT_EXPIRATION, JSON.stringify(freshData));

      // Stringified data
      resolve(freshData);
    });
  });
}

app.listen(3000, () => {
  console.log(`Server started on port 3000`);
});
