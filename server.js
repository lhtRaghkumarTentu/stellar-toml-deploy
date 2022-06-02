const express = require('express');
const app = express();
const port = process.env.PORT || 4000;
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const stellar = require('stellar-sdk');

app.get("/",(req,res)=>{
    res.send("Hello is This Working!!!!!!!!!!!!")
});

app.use(cors());

const {
    SERVER_KEY_PAIR,
    CHALLENGE_EXPIRE_IN,
    INVALID_SEQUENCE
   } = require(`../config/${process.env.ENV}/config.js`);

const randomNonce = () => {
    return crypto.randomBytes(32).toString("hex");
};

const account = new stellar.Account(SERVER_KEY_PAIR.publicKey(),INVALID_SEQUENCE);

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

app.get('/sep6/info',(req,res)=>{
    res.json({
        "deposit": {
            "AstroDollar": {
                "enabled": true,
                "authentication_required": true,
                "fields": {
                    "type": {
                        "description": "'bank_account' is the only value supported'",
                        "choices": [
                            "bank_account"
                        ]
                    }
                }
            }
        },
        "withdraw": {
            "AstroDollar": {
                "enabled": true,
                "authentication_required": true,
                "types": {
                    "bank_account": {
                        "fields": {
                            "dest": {
                                "description": "bank account number"
                            },
                            "dest_extra": {
                                "description": "bank routing number"
                            }
                        }
                    }
                }
            }
        },
        "fee": {
            "enabled": true,
            "authentication_required": true
        },
        "transactions": {
            "enabled": true,
            "authentication_required": true
        },
        "transaction": {
            "enabled": true,
            "authentication_required": true
        },
        "features": {
            "account_creation": true,
            "claimable_balances": true
        },
        "deposit-exchange": {
            "AstroDollar": {
                "enabled": true,
                "authentication_required": true,
                "fields": {
                    "type": {
                        "description": "'bank_account' is the only value supported'",
                        "choices": [
                            "bank_account"
                        ]
                    }
                }
            }
        },
        "withdraw-exchange": {
            "AstroDollar": {
                "enabled": true,
                "authentication_required": true,
                "types": {
                    "bank_account": {
                        "fields": {
                            "dest": {
                                "description": "bank account number"
                            },
                            "dest_extra": {
                                "description": "bank routing number"
                            }
                        }
                    }
                }
            }
        }
    })
    })

app.get('auth',(req, res) => {
    // Public key of the client requesting access.
    const clientPublicKey = req.query.public_key;
   
    // Transaction time bounds, current time..+300 seconds by default.
    // In other words, challenge transaction will expire in 5 minutes since it was generated.
    // This prevents replay attacks.
    const minTime = Date.now();
    const maxTime = minTime + CHALLENGE_EXPIRE_IN;
    const timebounds = {
      minTime: minTime.toString(),
      maxTime: maxTime.toString()
    };
    const op = stellar.Operation.manageData({
        source: clientPublicKey,
        name: "Sample auth",
        value: randomNonce()
      });
      
      const tx = new stellar.TransactionBuilder(account, { timebounds, fee: 100 })
        .addOperation(op)
        .build();
      tx.sign(SERVER_KEY_PAIR); // Sign by server
      res.json({ transaction: tx.toEnvelope().toXDR("base64") });
      
      console.info(`${clientPublicKey} requested challenge => OK`);
     })

app.listen(port,()=>{
    console.log(`App is Running Locally on Port http://localhost:${port}`)
})