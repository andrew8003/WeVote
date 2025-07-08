const express = require('express');
const app = express();

app.set('view engine', 'ejs');
app.use('/stylesheets', express.static('stylesheets'));
app.use('/assets', express.static('assets'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('template');
});

app.listen(3000);

// npm run devStart
// nodemon server.js 
// uses ejs as the rendering engine
// epress.js