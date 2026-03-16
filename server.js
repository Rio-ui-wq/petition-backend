const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.listen(process.env.PORT || 3002, () => {
  console.log(`サーバー起動中：http://localhost:${process.env.PORT || 3002}`);
});