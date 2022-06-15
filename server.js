const express = require('express');
const app = express();
const port = process.env.PORT || 4000;
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const stellar = require('stellar-sdk');
// const {validateTimeBounds} = require('stellar-sdk');
// const jwt = require("jsonwebtoken");
// const { Transaction } = require('stellar-sdk');

app.get("/",(req,res)=>{
    res.send("Hello is This Working!!!!!!!!!!!!")
});

app.use(cors());

const server = new stellar.Server("https://horizon-testnet.stellar.org")
const SERVER_KEY_PAIR = stellar.Keypair.fromSecret("SA6JUAPMIEOXKFE7VSNTOGB4TFDXRMVCBE6DWZNTW7JWKLMMRJY2ZZMC");
// console.log(SERVER_KEY_PAIR.publicKey());
const getSequence = async()=>{
    let serverAccount = await server.loadAccount(SERVER_KEY_PAIR.publicKey())
    let getSequenceNumber = serverAccount.sequence;
    return getSequenceNumber;
}
const INVALID_SEQUENCE = "-1"


const CHALLENGE_EXPIRE_IN = 300
const randomNonce = () => {
    return crypto.randomBytes(32).toString("hex");
};

//SEP01
app.get('/.well-known/stellar.toml', (req, res, next) => {
    const options = {
      root: path.join(__dirname, 'public'),
    }
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("content-type", "text/plain");
    res.sendFile('stellar.toml', options);
})

//SEP24
app.get('/sep24/info',(req,res)=>{
res.json({
    "deposit": {
        "AstroDollar": {
            "enabled": true,
            "fee_fixed": 1.0
        },
        "COINR": {
            "enabled": true,
            "fee_fixed": 1.0
        }
    },
    "withdraw": {
        "AstroDollar": {
            "enabled": true,
            "fee_fixed": 1.0
        },
        "COINR": {
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

//SEP06
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
            },
            "COINR": {
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
            },
            "COINR": {
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
            },
            "COINR": {
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
            },
            "COINR": {
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

//SEP10
app.get('/auth',async(req, res) => {
    const clientPublicKey = req.query.account;
    const minTime = Math.floor(Date.now() / 1000);
    console.log(minTime);
    const maxTime = minTime + CHALLENGE_EXPIRE_IN;
    const timebounds = {
      minTime: minTime.toString(),
      maxTime: maxTime.toString()
    };
    const op = stellar.Operation.manageData({
        source: clientPublicKey,
        name: "stellartomlorg.herokuapp.com",
        value: randomNonce()
      });
    const account = new stellar.Account(SERVER_KEY_PAIR.publicKey(), INVALID_SEQUENCE);
    const tx = new stellar.TransactionBuilder(account, { timebounds,fee:100}).addOperation(op).setNetworkPassphrase(stellar.Networks.TESTNET).build()
    tx.sign(SERVER_KEY_PAIR);
    res.json ({ transaction: tx.toEnvelope().toXDR("base64"), network_passphrase: stellar.Networks.TESTNET});
})



app.listen(port,()=>{
    console.log(`App is Running Locally on Port http://localhost:${port}`)
})                                   