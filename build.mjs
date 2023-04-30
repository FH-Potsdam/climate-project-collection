import * as dotenv from 'dotenv';
dotenv.config();

import { NetlifyAPI } from 'netlify';

import { default as sync } from './data/sync.json' assert { type: 'json' };
import { default as data } from './data/data.json' assert { type: 'json' };

import { writeFileSync, createWriteStream, unlink } from 'fs';
import * as https from 'https';

const download = (url, file) => {
  return new Promise((resolve, reject) => {
    const stream = createWriteStream(file);
    https.get(url, (response) => {
      response.pipe(stream);
      stream.on("finish", () => {
        stream.close();
        resolve();
      });
      stream.on("error", (err) => {
        reject(err);
      });
    }).on('error', (err) => {
      unlink(file);
      reject(err);
    });
  });
};

const run = async () => {
  let additions = 0;
  const client = new NetlifyAPI(process.env.APIKEY);
  const submissions = await client.listFormSubmissions({
    form_id: process.env.FORMID,
    per_page: 100
  });
  for (let s = 0; s < submissions.length; s++) {
    const submission = submissions[s];
    if (!sync.includes(submission.id)) {
      let img = '';
      if (submission.data.image) {
        try {
          const ext = submission.data.image.filename.split('.');
          await download(submission.data.image.url, './data/images/' + submission.id + '.' + ext[ext.length - 1]);
          img = submission.data.image.url, submission.id + '.' + ext[ext.length - 1];
        } catch (error) {
          console.error(error);
        }
      }

      delete submission.data.referrer;
      delete submission.data.user_agent;
      delete submission.data.ip;
      submission.data.id = submission.id;
      submission.img = img;

      data.push(submission.data);
      sync.push(submission.id);
      additions++;
    }
  }
  writeFileSync('./data/sync.json', JSON.stringify(sync), 'utf-8');
  writeFileSync('./data/data.json', JSON.stringify(data), 'utf-8');

  console.log('Additions: ' + additions);
};

run();