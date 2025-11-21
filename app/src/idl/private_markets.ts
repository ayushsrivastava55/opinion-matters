/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/private_markets.json`.
 */
export type PrivateMarkets = {
  "address": "AH6m7tchm3SrjscGu9epRg2MhnpzpKctjK4nueFLwuWN",
  "metadata": {
    "name": "privateMarkets",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Private Prediction Markets with Arcium MPC"
  },
  "instructions": [
    {
      "name": "applyBatchClear",
      "docs": [
        "Apply batch clear results from Arcium MPC"
      ],
      "discriminator": [
        106,
        52,
        52,
        243,
        85,
        254,
        145,
        247
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "arciumAuthority",
          "docs": [
            "Arcium MPC authority (in production, verify signature)"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newStateCommitment",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "uniformPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "batchClearCallback",
      "discriminator": [
        245,
        139,
        90,
        131,
        23,
        181,
        123,
        200
      ],
      "accounts": [
        {
          "name": "arciumProgram",
          "address": "Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp"
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "market",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "output",
          "type": {
            "defined": {
              "name": "computationOutputs",
              "generics": [
                {
                  "kind": "type",
                  "type": {
                    "defined": {
                      "name": "batchClearOutput"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "createMarket",
      "discriminator": [
        103,
        226,
        97,
        235,
        200,
        188,
        251,
        254
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "collateralVault",
          "writable": true
        },
        {
          "name": "feeVault",
          "writable": true
        },
        {
          "name": "yesMint",
          "writable": true
        },
        {
          "name": "noMint",
          "writable": true
        },
        {
          "name": "collateralMint"
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "question",
          "type": "string"
        },
        {
          "name": "endTime",
          "type": "i64"
        },
        {
          "name": "feeBps",
          "type": "u16"
        },
        {
          "name": "batchInterval",
          "type": "i64"
        },
        {
          "name": "resolverQuorum",
          "type": "u8"
        }
      ]
    },
    {
      "name": "depositCollateral",
      "discriminator": [
        156,
        131,
        142,
        116,
        146,
        247,
        162,
        120
      ],
      "accounts": [
        {
          "name": "market"
        },
        {
          "name": "collateralVault",
          "writable": true
        },
        {
          "name": "userCollateral",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initBatchClearCompDef",
      "discriminator": [
        171,
        87,
        91,
        78,
        236,
        246,
        74,
        9
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount",
          "writable": true
        },
        {
          "name": "compDefAccount",
          "writable": true
        },
        {
          "name": "arciumProgram",
          "address": "Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initPrivateTradeCompDef",
      "discriminator": [
        104,
        157,
        5,
        160,
        183,
        163,
        23,
        14
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount",
          "writable": true
        },
        {
          "name": "compDefAccount",
          "writable": true
        },
        {
          "name": "arciumProgram",
          "address": "Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initResolveMarketCompDef",
      "discriminator": [
        78,
        239,
        171,
        21,
        24,
        135,
        40,
        228
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount",
          "writable": true
        },
        {
          "name": "compDefAccount",
          "writable": true
        },
        {
          "name": "arciumProgram",
          "address": "Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "mintOutcomeTokens",
      "discriminator": [
        27,
        243,
        237,
        46,
        2,
        226,
        144,
        209
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "outcomeMint",
          "writable": true
        },
        {
          "name": "recipientTokenAccount",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "market"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "privateTradeCallback",
      "discriminator": [
        24,
        124,
        24,
        177,
        238,
        30,
        112,
        244
      ],
      "accounts": [
        {
          "name": "arciumProgram",
          "address": "Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp"
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "market",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "output",
          "type": {
            "defined": {
              "name": "computationOutputs",
              "generics": [
                {
                  "kind": "type",
                  "type": {
                    "defined": {
                      "name": "privateTradeOutput"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "redeemTokens",
      "discriminator": [
        246,
        98,
        134,
        41,
        152,
        33,
        120,
        69
      ],
      "accounts": [
        {
          "name": "market"
        },
        {
          "name": "outcomeMint",
          "writable": true
        },
        {
          "name": "userOutcomeTokens",
          "writable": true
        },
        {
          "name": "collateralVault",
          "writable": true
        },
        {
          "name": "userCollateralAccount",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "resolveMarket",
      "discriminator": [
        155,
        23,
        80,
        173,
        46,
        74,
        23,
        239
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "arciumAuthority",
          "docs": [
            "Arcium MPC authority (in production, verify signature)"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "finalOutcome",
          "type": "u8"
        },
        {
          "name": "resolutionProof",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "resolveMarketCallback",
      "discriminator": [
        222,
        135,
        177,
        148,
        20,
        212,
        222,
        58
      ],
      "accounts": [
        {
          "name": "arciumProgram",
          "address": "Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp"
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "market",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "output",
          "type": {
            "defined": {
              "name": "computationOutputs",
              "generics": [
                {
                  "kind": "type",
                  "type": {
                    "defined": {
                      "name": "resolveMarketOutput"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "stakeResolver",
      "discriminator": [
        81,
        248,
        206,
        93,
        116,
        223,
        41,
        81
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "resolver",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "collateralVault",
          "writable": true
        },
        {
          "name": "resolverTokenAccount",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "submitAttestation",
      "docs": [
        "Submit encrypted attestation for market resolution"
      ],
      "discriminator": [
        238,
        220,
        255,
        105,
        183,
        211,
        40,
        83
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "signPdaAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  83,
                  105,
                  103,
                  110,
                  101,
                  114,
                  65,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "mempoolAccount",
          "writable": true
        },
        {
          "name": "executingPool",
          "writable": true
        },
        {
          "name": "computationAccount",
          "writable": true
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "clusterAccount",
          "writable": true
        },
        {
          "name": "poolAccount",
          "writable": true,
          "address": "FsWbPQcJQ2cCyr9ndse13fDqds4F2Ezx2WgTL25Dke4M"
        },
        {
          "name": "clockAccount",
          "address": "AxygBawEvVwZPetj3yPJb9sGdZvaJYsVguET1zFUQkV"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp"
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "resolver",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "computationOffset",
          "type": "u64"
        },
        {
          "name": "attestation",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "submitBatchOrder",
      "docs": [
        "Submit a batch order"
      ],
      "discriminator": [
        35,
        173,
        49,
        40,
        36,
        49,
        158,
        224
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "signPdaAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  83,
                  105,
                  103,
                  110,
                  101,
                  114,
                  65,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "mempoolAccount",
          "writable": true
        },
        {
          "name": "executingPool",
          "writable": true
        },
        {
          "name": "computationAccount",
          "writable": true
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "clusterAccount",
          "writable": true
        },
        {
          "name": "poolAccount",
          "writable": true,
          "address": "FsWbPQcJQ2cCyr9ndse13fDqds4F2Ezx2WgTL25Dke4M"
        },
        {
          "name": "clockAccount",
          "address": "AxygBawEvVwZPetj3yPJb9sGdZvaJYsVguET1zFUQkV"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp"
        },
        {
          "name": "market",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "computationOffset",
          "type": "u64"
        },
        {
          "name": "batchOrders",
          "type": {
            "vec": {
              "defined": {
                "name": "batchOrderData"
              }
            }
          }
        }
      ]
    },
    {
      "name": "submitPrivateTrade",
      "docs": [
        "Submit a private trade"
      ],
      "discriminator": [
        137,
        103,
        194,
        131,
        80,
        25,
        150,
        182
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "signPdaAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  83,
                  105,
                  103,
                  110,
                  101,
                  114,
                  65,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "mempoolAccount",
          "writable": true
        },
        {
          "name": "executingPool",
          "writable": true
        },
        {
          "name": "computationAccount",
          "writable": true
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "clusterAccount",
          "writable": true
        },
        {
          "name": "poolAccount",
          "writable": true,
          "address": "FsWbPQcJQ2cCyr9ndse13fDqds4F2Ezx2WgTL25Dke4M"
        },
        {
          "name": "clockAccount",
          "address": "AxygBawEvVwZPetj3yPJb9sGdZvaJYsVguET1zFUQkV"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp"
        },
        {
          "name": "market",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "computationOffset",
          "type": "u64"
        },
        {
          "name": "ciphertextAmount",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "ciphertextSide",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "ciphertextMaxPrice",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "nonce",
          "type": "u128"
        },
        {
          "name": "clientPubkey",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "updateCfmmState",
      "docs": [
        "Update CFMM state from private trade computation"
      ],
      "discriminator": [
        71,
        109,
        58,
        20,
        152,
        33,
        65,
        191
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "yesMint",
          "writable": true
        },
        {
          "name": "noMint",
          "writable": true
        },
        {
          "name": "arciumAuthority",
          "docs": [
            "Arcium MPC authority (in production, verify signature)"
          ],
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "newStateCommitment",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "reserveDeltaYes",
          "type": "i64"
        },
        {
          "name": "reserveDeltaNo",
          "type": "i64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "clockAccount",
      "discriminator": [
        152,
        171,
        158,
        195,
        75,
        61,
        51,
        8
      ]
    },
    {
      "name": "cluster",
      "discriminator": [
        236,
        225,
        118,
        228,
        173,
        106,
        18,
        60
      ]
    },
    {
      "name": "computationDefinitionAccount",
      "discriminator": [
        245,
        176,
        217,
        221,
        253,
        104,
        172,
        200
      ]
    },
    {
      "name": "feePool",
      "discriminator": [
        172,
        38,
        77,
        146,
        148,
        5,
        51,
        242
      ]
    },
    {
      "name": "mxeAccount",
      "discriminator": [
        103,
        26,
        85,
        250,
        179,
        159,
        17,
        117
      ]
    },
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "resolver",
      "discriminator": [
        108,
        125,
        211,
        206,
        52,
        124,
        132,
        79
      ]
    },
    {
      "name": "signerAccount",
      "discriminator": [
        127,
        212,
        7,
        180,
        17,
        50,
        249,
        193
      ]
    }
  ],
  "events": [
    {
      "name": "attestationSubmitted",
      "discriminator": [
        177,
        213,
        117,
        225,
        166,
        11,
        54,
        218
      ]
    },
    {
      "name": "batchCleared",
      "discriminator": [
        8,
        207,
        38,
        149,
        136,
        1,
        85,
        160
      ]
    },
    {
      "name": "marketResolved",
      "discriminator": [
        89,
        67,
        230,
        95,
        143,
        106,
        199,
        202
      ]
    },
    {
      "name": "privateTradeExecuted",
      "discriminator": [
        58,
        56,
        178,
        57,
        69,
        124,
        167,
        245
      ]
    },
    {
      "name": "privateTradeQueued",
      "discriminator": [
        170,
        20,
        181,
        184,
        223,
        128,
        16,
        26
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "questionTooLong",
      "msg": "Question exceeds maximum length"
    },
    {
      "code": 6001,
      "name": "invalidEndTime",
      "msg": "Invalid end time (must be in the future)"
    },
    {
      "code": 6002,
      "name": "invalidFeeBps",
      "msg": "Fee basis points out of range"
    },
    {
      "code": 6003,
      "name": "invalidBatchInterval",
      "msg": "Batch interval out of range"
    },
    {
      "code": 6004,
      "name": "marketEnded",
      "msg": "Market has already ended"
    },
    {
      "code": 6005,
      "name": "marketNotEnded",
      "msg": "Market has not ended yet"
    },
    {
      "code": 6006,
      "name": "marketAlreadyResolved",
      "msg": "Market is already resolved"
    },
    {
      "code": 6007,
      "name": "marketNotResolved",
      "msg": "Market is not resolved yet"
    },
    {
      "code": 6008,
      "name": "insufficientCollateral",
      "msg": "Insufficient collateral"
    },
    {
      "code": 6009,
      "name": "invalidQuorum",
      "msg": "Invalid resolver quorum"
    },
    {
      "code": 6010,
      "name": "insufficientResolvers",
      "msg": "Not enough resolvers staked"
    },
    {
      "code": 6011,
      "name": "insufficientStake",
      "msg": "Insufficient stake amount"
    },
    {
      "code": 6012,
      "name": "resolverAlreadyStaked",
      "msg": "Resolver already staked"
    },
    {
      "code": 6013,
      "name": "invalidAttestation",
      "msg": "Invalid attestation"
    },
    {
      "code": 6014,
      "name": "batchWindowOpen",
      "msg": "Batch clearing window has not ended"
    },
    {
      "code": 6015,
      "name": "invalidStateCommitment",
      "msg": "Invalid state commitment"
    },
    {
      "code": 6016,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6017,
      "name": "invalidOutcome",
      "msg": "Invalid outcome value"
    },
    {
      "code": 6018,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6019,
      "name": "invalidCfmmState",
      "msg": "Invalid CFMM state"
    },
    {
      "code": 6020,
      "name": "slippageExceeded",
      "msg": "Slippage tolerance exceeded"
    },
    {
      "code": 6021,
      "name": "computationFailed",
      "msg": "Arcium MPC computation failed"
    },
    {
      "code": 6022,
      "name": "computationAborted",
      "msg": "Arcium MPC computation aborted"
    },
    {
      "code": 6023,
      "name": "invalidResolutionState",
      "msg": "Invalid resolution state"
    },
    {
      "code": 6024,
      "name": "clusterNotSet",
      "msg": "Cluster not set"
    }
  ],
  "types": [
    {
      "name": "activation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "activationEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          },
          {
            "name": "deactivationEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          }
        ]
      }
    },
    {
      "name": "attestationSubmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "resolver",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "count",
            "type": "u8"
          },
          {
            "name": "quorum",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "batchClearOutput",
      "docs": [
        "The output of the callback instruction. Provided as a struct with ordered fields",
        "as anchor does not support tuples and tuple structs yet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": {
              "defined": {
                "name": "sharedEncryptedStruct",
                "generics": [
                  {
                    "kind": "const",
                    "value": "5"
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "batchCleared",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "uniformPrice",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "batchOrderData",
      "docs": [
        "Batch order data for submission"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commitment",
            "docs": [
              "Encrypted order commitment"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "docs": [
              "Order amount"
            ],
            "type": "u64"
          },
          {
            "name": "isBuy",
            "docs": [
              "True for buy, false for sell"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "circuitSource",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "local",
            "fields": [
              {
                "defined": {
                  "name": "localCircuitSource"
                }
              }
            ]
          },
          {
            "name": "onChain",
            "fields": [
              {
                "defined": {
                  "name": "onChainCircuitSource"
                }
              }
            ]
          },
          {
            "name": "offChain",
            "fields": [
              {
                "defined": {
                  "name": "offChainCircuitSource"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "clockAccount",
      "docs": [
        "An account storing the current network epoch"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "startEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          },
          {
            "name": "currentEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          },
          {
            "name": "startEpochTimestamp",
            "type": {
              "defined": {
                "name": "timestamp"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "cluster",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "maxSize",
            "type": "u32"
          },
          {
            "name": "activation",
            "type": {
              "defined": {
                "name": "activation"
              }
            }
          },
          {
            "name": "maxCapacity",
            "type": "u64"
          },
          {
            "name": "cuPrice",
            "type": "u64"
          },
          {
            "name": "cuPriceProposals",
            "type": {
              "array": [
                "u64",
                32
              ]
            }
          },
          {
            "name": "lastUpdatedEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          },
          {
            "name": "mxes",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "nodes",
            "type": {
              "vec": {
                "defined": {
                  "name": "nodeRef"
                }
              }
            }
          },
          {
            "name": "pendingNodes",
            "type": {
              "vec": {
                "defined": {
                  "name": "nodeRef"
                }
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "computationDefinitionAccount",
      "docs": [
        "An account representing a [ComputationDefinition] in a MXE."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "finalizationAuthority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "cuAmount",
            "type": "u64"
          },
          {
            "name": "definition",
            "type": {
              "defined": {
                "name": "computationDefinitionMeta"
              }
            }
          },
          {
            "name": "circuitSource",
            "type": {
              "defined": {
                "name": "circuitSource"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "computationDefinitionMeta",
      "docs": [
        "A computation definition for execution in a MXE."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "circuitLen",
            "type": "u32"
          },
          {
            "name": "signature",
            "type": {
              "defined": {
                "name": "computationSignature"
              }
            }
          }
        ]
      }
    },
    {
      "name": "computationOutputs",
      "generics": [
        {
          "kind": "type",
          "name": "o"
        }
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "success",
            "fields": [
              {
                "generic": "o"
              }
            ]
          },
          {
            "name": "failure"
          }
        ]
      }
    },
    {
      "name": "computationSignature",
      "docs": [
        "The signature of a computation defined in a [ComputationDefinition]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "parameters",
            "type": {
              "vec": {
                "defined": {
                  "name": "parameter"
                }
              }
            }
          },
          {
            "name": "outputs",
            "type": {
              "vec": {
                "defined": {
                  "name": "output"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "epoch",
      "docs": [
        "The network epoch"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          "u64"
        ]
      }
    },
    {
      "name": "feePool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "localCircuitSource",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "mxeKeygen"
          }
        ]
      }
    },
    {
      "name": "mxeAccount",
      "docs": [
        "A MPC Execution Environment."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "cluster",
            "type": {
              "option": "u32"
            }
          },
          {
            "name": "utilityPubkeys",
            "type": {
              "defined": {
                "name": "setUnset",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "utilityPubkeys"
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            "name": "fallbackClusters",
            "type": {
              "vec": "u32"
            }
          },
          {
            "name": "rejectedClusters",
            "type": {
              "vec": "u32"
            }
          },
          {
            "name": "computationDefinitions",
            "type": {
              "vec": "u32"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "market",
      "docs": [
        "Market state for a prediction market"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Market authority (creator)"
            ],
            "type": "pubkey"
          },
          {
            "name": "question",
            "docs": [
              "Market question"
            ],
            "type": "string"
          },
          {
            "name": "endTime",
            "docs": [
              "End timestamp (unix)"
            ],
            "type": "i64"
          },
          {
            "name": "feeBps",
            "docs": [
              "Fee in basis points"
            ],
            "type": "u16"
          },
          {
            "name": "batchInterval",
            "docs": [
              "Batch auction interval in seconds"
            ],
            "type": "i64"
          },
          {
            "name": "nextBatchClear",
            "docs": [
              "Next batch clear timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "resolverQuorum",
            "docs": [
              "Resolver quorum requirement"
            ],
            "type": "u8"
          },
          {
            "name": "resolverCount",
            "docs": [
              "Number of resolvers currently staked"
            ],
            "type": "u8"
          },
          {
            "name": "attestationCount",
            "docs": [
              "Number of resolvers who have submitted an attestation"
            ],
            "type": "u8"
          },
          {
            "name": "collateralVault",
            "docs": [
              "Collateral vault"
            ],
            "type": "pubkey"
          },
          {
            "name": "feeVault",
            "docs": [
              "Fee vault"
            ],
            "type": "pubkey"
          },
          {
            "name": "yesMint",
            "docs": [
              "YES outcome token mint"
            ],
            "type": "pubkey"
          },
          {
            "name": "noMint",
            "docs": [
              "NO outcome token mint"
            ],
            "type": "pubkey"
          },
          {
            "name": "collateralMint",
            "docs": [
              "Collateral mint"
            ],
            "type": "pubkey"
          },
          {
            "name": "cfmmStateCommitment",
            "docs": [
              "CFMM state commitment (hash of encrypted reserves)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "yesReserves",
            "docs": [
              "Current YES reserves (public aggregate)"
            ],
            "type": "u64"
          },
          {
            "name": "noReserves",
            "docs": [
              "Current NO reserves (public aggregate)"
            ],
            "type": "u64"
          },
          {
            "name": "totalLiquidity",
            "docs": [
              "Total liquidity"
            ],
            "type": "u64"
          },
          {
            "name": "totalVolume",
            "docs": [
              "Total volume traded"
            ],
            "type": "u64"
          },
          {
            "name": "batchOrderRoot",
            "docs": [
              "Batch order commitment root"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "batchOrderCount",
            "docs": [
              "Number of orders in current batch"
            ],
            "type": "u32"
          },
          {
            "name": "resolutionState",
            "docs": [
              "Market resolution state"
            ],
            "type": {
              "defined": {
                "name": "resolutionState"
              }
            }
          },
          {
            "name": "finalOutcome",
            "docs": [
              "Final outcome (None if unresolved, Some(0) = NO, Some(1) = YES)"
            ],
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "authorityBump",
            "docs": [
              "Authority bump seed for PDA"
            ],
            "type": "u8"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed for PDA"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "marketResolved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": "u8"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "nodeRef",
      "docs": [
        "A reference to a node in the cluster.",
        "The offset is to derive the Node Account.",
        "The current_total_rewards is the total rewards the node has received so far in the current",
        "epoch."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "offset",
            "type": "u32"
          },
          {
            "name": "currentTotalRewards",
            "type": "u64"
          },
          {
            "name": "vote",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "offChainCircuitSource",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "source",
            "type": "string"
          },
          {
            "name": "hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "onChainCircuitSource",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "isCompleted",
            "type": "bool"
          },
          {
            "name": "uploadAuth",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "output",
      "docs": [
        "An output of a computation.",
        "We currently don't support encrypted outputs yet since encrypted values are passed via",
        "data objects."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "plaintextBool"
          },
          {
            "name": "plaintextU8"
          },
          {
            "name": "plaintextU16"
          },
          {
            "name": "plaintextU32"
          },
          {
            "name": "plaintextU64"
          },
          {
            "name": "plaintextU128"
          },
          {
            "name": "ciphertext"
          },
          {
            "name": "arcisPubkey"
          },
          {
            "name": "plaintextFloat"
          },
          {
            "name": "plaintextPoint"
          }
        ]
      }
    },
    {
      "name": "parameter",
      "docs": [
        "A parameter of a computation.",
        "We differentiate between plaintext and encrypted parameters and data objects.",
        "Plaintext parameters are directly provided as their value.",
        "Encrypted parameters are provided as an offchain reference to the data.",
        "Data objects are provided as a reference to the data object account."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "plaintextBool"
          },
          {
            "name": "plaintextU8"
          },
          {
            "name": "plaintextU16"
          },
          {
            "name": "plaintextU32"
          },
          {
            "name": "plaintextU64"
          },
          {
            "name": "plaintextU128"
          },
          {
            "name": "ciphertext"
          },
          {
            "name": "arcisPubkey"
          },
          {
            "name": "arcisSignature"
          },
          {
            "name": "plaintextFloat"
          },
          {
            "name": "manticoreAlgo"
          },
          {
            "name": "inputDataset"
          }
        ]
      }
    },
    {
      "name": "privateTradeExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "privateTradeOutput",
      "docs": [
        "The output of the callback instruction. Provided as a struct with ordered fields",
        "as anchor does not support tuples and tuple structs yet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": {
              "defined": {
                "name": "sharedEncryptedStruct",
                "generics": [
                  {
                    "kind": "const",
                    "value": "2"
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "privateTradeQueued",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "resolutionState",
      "docs": [
        "Resolution state enum"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "awaitingAttestation"
          },
          {
            "name": "computing"
          },
          {
            "name": "resolved"
          }
        ]
      }
    },
    {
      "name": "resolveMarketOutput",
      "docs": [
        "The output of the callback instruction. Provided as a struct with ordered fields",
        "as anchor does not support tuples and tuple structs yet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": {
              "defined": {
                "name": "sharedEncryptedStruct",
                "generics": [
                  {
                    "kind": "const",
                    "value": "2"
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "resolver",
      "docs": [
        "Resolver account"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Resolver pubkey"
            ],
            "type": "pubkey"
          },
          {
            "name": "market",
            "docs": [
              "Market this resolver is staking for"
            ],
            "type": "pubkey"
          },
          {
            "name": "stake",
            "docs": [
              "Amount staked"
            ],
            "type": "u64"
          },
          {
            "name": "hasAttested",
            "docs": [
              "Has submitted attestation"
            ],
            "type": "bool"
          },
          {
            "name": "attestationCommitment",
            "docs": [
              "Encrypted attestation commitment"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "attestationTimestamp",
            "docs": [
              "Timestamp of attestation"
            ],
            "type": "i64"
          },
          {
            "name": "count",
            "docs": [
              "Count of attestations (for tracking)"
            ],
            "type": "u8"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "setUnset",
      "generics": [
        {
          "kind": "type",
          "name": "t"
        }
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "set",
            "fields": [
              {
                "generic": "t"
              }
            ]
          },
          {
            "name": "unset",
            "fields": [
              {
                "generic": "t"
              },
              {
                "vec": "bool"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "sharedEncryptedStruct",
      "generics": [
        {
          "kind": "const",
          "name": "len",
          "type": "usize"
        }
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "encryptionKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "nonce",
            "type": "u128"
          },
          {
            "name": "ciphertexts",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                {
                  "generic": "len"
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "signerAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "timestamp",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "timestamp",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "utilityPubkeys",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "x25519Pubkey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "ed25519VerifyingKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "elgamalPubkey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "pubkeyValidityProof",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    }
  ]
};
