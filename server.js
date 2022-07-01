const stellar = require('stellar-sdk');
const jwt = require("jsonwebtoken");
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const app = express();
app.use(cors());



const SERVER_KEY_PAIR = stellar.Keypair.fromSecret(process.env.SERVER_SECRET_KEY);
const ALLOWED_ACCOUNTS = process.env.ALLOWED_ACCOUNTS;
const JWT_SECRET = process.env.JWT_SECRET
const ENDPOINT = process.env.ENDPOINT
const JWT_TOKEN_LIFETIME = 86400;
const CHALLENGE_EXPIRE_IN = 300
const INVALID_SEQUENCE = "-1"


const randomNonce = () => {
    return crypto.randomBytes(32).toString("hex");
};


/**
 * Anchor Status Check End Point
 */
app.get("/",(req,res)=>{
    res.send("Anchor is working!!!")
});


/**
 * -----------SEP1 Implimentation Start---------------//
 */
app.get('/.well-known/stellar.toml', (req, res, next) => {
    const options = { root: path.join(__dirname, 'public') }
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("content-type", "text/plain");
    res.sendFile('stellar.toml', options);
})
//-----------SEP1 Implimentation End------------------//


/**
 * -----------SEP6 Implimentation Start----------------//
 */
//-----------------INFO EndPoint----------------------//
app.get('/sep6/info',(req,res)=>{
    res.json({
        "deposit": {
            "LHTSD": {
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
        },
        "withdraw": {
            "LHTSD": {
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
            "LHTSD": {
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
        },
        "withdraw-exchange": {
            "LHTSD": {
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


/**
 * --------------SEP10 Implimentation Start-----------//
 */
//---------------GET /auth Endpoind------------------//
/**
 * @param ClientPublicKey {String}
 * @Returns challengeTransaction Envelop
 */
app.get('/auth',async(req, res) => {
    const clientPublicKey = req.query.account;
    const minTime = Math.floor(Date.now() / 1000);
    const maxTime = minTime + CHALLENGE_EXPIRE_IN;
    const timebounds = {
      minTime: minTime.toString(),
      maxTime: maxTime.toString()
    };
    const operation = stellar.Operation.manageData({
        source: clientPublicKey,
        name: "stellartomlorg.herokuapp.com auth",
        key: "stellartomlorg.herokuapp.com",
        value: randomNonce()
      });
    const account = new stellar.Account(SERVER_KEY_PAIR.publicKey(), INVALID_SEQUENCE);
    const transaction = new stellar.TransactionBuilder(account, { timebounds,fee:100}).addOperation(operation).setNetworkPassphrase(stellar.Networks.TESTNET).build()
    transaction.sign(SERVER_KEY_PAIR);
    console.log(transaction.source);
    console.log(SERVER_KEY_PAIR.publicKey());
    res.json ({ transaction: transaction.toEnvelope().toXDR("base64"), network_passphrase: transaction.networkPassphrase});
});

app.get("/rct",async(req,res)=>{
    const authEndpoint = "https://stellartomlorg.herokuapp.com/auth";
    const serverSigningKey = "GARFFRPXMNJO4Q35GLXAJX4E3WYLNRXZFBHFOSVHIZDT7OJ2W2R4TZ2Y"
    const params = { account: req.query.publicKey, home_domain: req.query.homeDomain };
    const authURL = new URL(authEndpoint);
    Object.entries(params).forEach(([key, value]) => {
    authURL.searchParams.append(key, value);
    });
    const response = await axios.get(authURL.toString())
    const resultJson = response.data
    if (!resultJson.transaction) {
        throw new Error("The response didn’t contain a transaction");
      }
      const { tx } = stellar.Utils.readChallengeTx(
        resultJson.transaction,
        serverSigningKey,
        resultJson.network_passphrase,
        req.query.homeDomain,
        authURL.host,
      );
      res.json ({ transaction: tx.toEnvelope().toXDR("base64"), network_passphrase: tx.networkPassphrase});
})


//---------------POST /sign Endpoind------------------//
/**
 * @param challengeTransaction {String}
 * @Returns signedTransaction Envelop
 */
app.post("/sign", (req, res) => {
    const envelope_xdr = req.query.transaction;
    const network_passphrase = req.query.network_passphrase;
    const transaction = new stellar.Transaction(envelope_xdr, network_passphrase);
    if (Number.parseInt(transaction.sequence, 10) !== 0){
        res.status(400);
        res.send("transaction sequence value must be '0'");
        return;
    }
    transaction.sign(Keypair.fromSecret(SERVER_KEY_PAIR));
    res.set("Access-Control-Allow-Origin", "*");
    res.status(200);
    res.send({"transaction": transaction.toEnvelope().toXDR("base64"), "network_passphrase": network_passphrase});
});


//---------------POST /auth Endpoind------------------//
/**
 * @param signedTransaction {String}
 * @Returns jwt
 */
app.post('/auth',(req,res)=>{
    const tx = new stellar.Transaction(req.query.transaction,stellar.Networks.TESTNET);
    tx.sign(SERVER_KEY_PAIR);
    let op = tx.operations[0];
    op.source = tx.source;
    console.log(tx.signatures);
    const { signatures } = tx;
    const hash = tx.hash();
    // Source account is a server's key pair
    if (tx.source != SERVER_KEY_PAIR.publicKey()) {
        return res.json({ error: "Invalid source account." });
    }
    // Challenge transaction was generated by server
    if (
        !signatures.some(signature =>
        SERVER_KEY_PAIR.verify(hash, signature.signature())
        )
    ) {
        return res.json({ error: "Server signature is missing or invalid." });
    }
    // Challenge transaction has manageData operation
    if (op.type != "manageData") {
        return res.json({ error: "Challenge has no manageData operation." });
    }
    // Source account present
    if (!op.source) {
        return res.json({ error: "Challenge has no source account." });
    }
    const clientKeyPair = stellar.Keypair.fromPublicKey(op.source);
     // Challenge transaction was signed by the client
    if (
        !signatures.some(signature =>
        clientKeyPair.verify(hash, signature.signature())
        )
    ) {
        return res.json({ error: "Client signature is missing or invalid." });
    }
    // Check that an access from this account is allowed
    if (ALLOWED_ACCOUNTS.indexOf(op.source) == -1) {
        console.info(
        `${op.source} requested token => access denied, check ALLOWED_ACCOUNTS`
        );
        return res.json({ error: `${op.source} access denied.` });
    }
    console.info(`${op.source} requested token => OK`);
    const token = jwt.sign(
        {
          iss: ENDPOINT,
          sub: op.source,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + parseInt(JWT_TOKEN_LIFETIME),
          jwtid: tx.hash().toString("hex")
        },
        JWT_SECRET
      );
    res.json({ token: token });
});


/**
 * --------------SEP12 Implimentation Start-----------//
 */


/**
 * -----------SEP24 Implimentation Start--------------//
 */
//-----------------INFO EndPoint---------------------//
app.get('/sep24/info',(req,res)=>{
    res.json({
        "deposit": {
            "LHTSD": {
                "enabled": true,
                "fee_fixed": 1.0
            }
        },
        "withdraw": {
            "LHTSD": {
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


/**
 * Starting Server
 */
const port = process.env.PORT;
app.listen(port,()=>{
    console.log(`App is Running Locally on Port http://localhost:${port}`)
})                                   