const express = require('express');
const app = express();
const port = process.env.PORT || 4000;
const path = require('path');
const cors = require('cors');

app.get("/",(req,res)=>{
    res.send("Hello is This Working!!!!!!!!!!!!")
});

app.use(cors());

app.get('/.well-known/stellar.toml', (req, res, next) => {
    const options = {
      root: path.join(__dirname, 'public'),
    }
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("content-type", "text/plain");
    res.sendFile('stellar.toml', options);
  })

  app.get('/sep24/info',(req,res)=>{
    res.json({
      "deposit": {
          "AstroDollar": {
              "enabled": true,
              "fee_fixed": 1.0
          }
      },
      "withdraw": {
          "AstroDollar": {
              "enabled": true,
              "fee_fixed": 1.0
          }
      },
      "fee": {
          "enabled": true
      },
      "features": {
          "account_creation": true,
          "claimable_balances": true
      }
    })
  })

app.listen(port,()=>{
    console.log(`App is Running Locally on Port http://localhost:${port}`)
})