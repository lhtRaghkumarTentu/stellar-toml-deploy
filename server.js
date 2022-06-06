const express = require('express');
const app = express();
const port = process.env.PORT || 4000;
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const stellar = require('stellar-sdk');
const jwt = require("jsonwebtoken");
const { Transaction } = require('stellar-sdk');

app.get("/",(req,res)=>{
    res.send("Hello is This Working!!!!!!!!!!!!")
});

app.use(cors());

const SERVER_KEY_PAIR = stellar.Keypair.fromSecret("SA6JUAPMIEOXKFE7VSNTOGB4TFDXRMVCBE6DWZNTW7JWKLMMRJY2ZZMC");
const JWT_TOKEN_LIFETIME = 300
const INVALID_SEQUENCE = "0"
CHALLENGE_EXPIRE_IN = 300
const ALLOWED_ACCOUNTS = ["GBRZDRPULVPWPZFVRJYK4OMKY22QHZOD5KEUEGUALM2KADZ3U54QK6G6", "GARMGTBWPPAFGIM5OAN5ZIMFDMLEZ2S7VJUTXT5W6YEQIY56Q4XSE7MG"]
const randomNonce = () => {
    return crypto.randomBytes(32).toString("hex");
};
const JWT_SECRET = randomNonce();
// console.log(randomNonce());
const account = new stellar.Account(SERVER_KEY_PAIR.publicKey(), INVALID_SEQUENCE);

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

app.get('/auth',(req, res) => {
    // console.log(req);
    const clientPublicKey = req.query.account;
    console.log(clientPublicKey);
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
    console.log(account);
    const tx = new stellar.TransactionBuilder(account, { timebounds, fee:100}).addOperation(op).setNetworkPassphrase("Test SDF Network ; September 2022").build()
    console.log(tx)
    tx.sign(SERVER_KEY_PAIR);
    res.json({ transaction: tx.toEnvelope().toXDR("base64"),network_passpharse: "Test SDF Network ; September 2022"});
    console.log(tx);
    console.info(`${clientPublicKey} requested challenge => OK`);
})


// app.post('/auth',(req, res) => {
//     const tx = new Transaction(req.params.transaction);
//     let op = tx.operations[0];
//     op.source = tx.source;
//     const { signatures } = tx;
//     const hash = tx.hash();

//     // Source account is a server's key pair
//     if (tx.source != SERVER_KEY_PAIR.publicKey()) {
//     return res.json({ error: "Invalid source account." });
//     }

//     // Challenge transaction was generated by server
//     if (
//     !signatures.some(signature =>
//         SERVER_KEY_PAIR.verify(hash, signature.signature())
//     )
//     ) {
//     return res.json({ error: "Server signature is missing or invalid." });
//     }

//     // Challenge transaction is not expired
//     if (
//     !(
//         tx.timeBounds &&
//         Date.now() > Number.parseInt(tx.timeBounds.minTime, 10) &&
//         Date.now() < Number.parseInt(tx.timeBounds.maxTime, 10)
//     )
//     ) {
//     return res.json({ error: "Challenge transaction expired." });
//     }

//     // Challenge transaction has manageData operation
//     if (op.type != "manageData") {
//     return res.json({ error: "Challenge has no manageData operation." });
//     }

//     // Source account present
//     if (!op.source) {
//     return res.json({ error: "Challenge has no source account." });
//     }

//     const clientKeyPair = stellar.Keypair.fromPublicKey(op.source);
//     // Challenge transaction was signed by the client
//     if (
//         !signatures.some(signature =>
//         clientKeyPair.verify(hash, signature.signature())
//         )
//     ) {
//         return res.json({ error: "Client signature is missing or invalid." });
//     }
    
//     // Check that an access from this account is allowed
//     if (ALLOWED_ACCOUNTS.indexOf(op.source) == -1) {
//         console.info(
//         `${op.source} requested token => access denied, check ALLOWED_ACCOUNTS`
//         );
//         return res.json({ error: `${op.source} access denied.` });
//     }
    
//     console.info(`${op.source} requested token => OK`);
    
//     const token = jwt.sign(
//         {
//         iss: ENDPOINT,
//         sub: op.source,
//         iat: Math.floor(Date.now() / 1000),
//         exp: Math.floor(Date.now() / 1000) + parseInt(JWT_TOKEN_LIFETIME),
//         jwtid: tx.hash().toString("hex")
//         },
//         JWT_SECRET
//     );  
//     res.json({ token: token });
// })


app.listen(port,()=>{
    console.log(`App is Running Locally on Port http://localhost:${port}`)
})

