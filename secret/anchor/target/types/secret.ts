/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/secret.json`.
 */
export type Secret = {
  "address": "coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF",
  "metadata": {
    "name": "secret",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createProfile",
      "discriminator": [
        225,
        205,
        234,
        143,
        17,
        186,
        50,
        220
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "profileName"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "The vault that will hold SOL for each received like.",
            "Why we use a separate vault:",
            "- Solana accounts must remain **rent-exempt** to persist.",
            "- If we store lamports directly in the `User` account and its balance drops below",
            "the rent-exempt threshold (e.g., after a withdrawal), the account could be purged.",
            "- `User` is a data account, so mixing lamports and state increases fragility.",
            "- This vault PDA has **no custom data layout** — it's just a secure lamport holder.",
            "",
            "Design Pattern:",
            "- Keep **data and funds separate**",
            "- Store metadata in `User`",
            "- Store SOL in a **dedicated PDA vault**",
            "",
            "Why `UncheckedAccount`:",
            "- We're only transferring SOL (no deserialization required)",
            "- The vault is a PDA we derive deterministically with known seeds",
            "- Ownership checks aren't enforced because it's program-derived and safe",
            "- Minimal overhead — we just need the public key and `mut` access",
            "",
            "Safety:",
            "- This vault must be verified by seeds in the program logic"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "profile"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "profileName",
          "type": "string"
        },
        {
          "name": "bio",
          "type": "string"
        },
        {
          "name": "gender",
          "type": "string"
        },
        {
          "name": "lookingFor",
          "type": "string"
        },
        {
          "name": "avatarUri",
          "type": "string"
        }
      ]
    },
    {
      "name": "deleteProfile",
      "discriminator": [
        213,
        96,
        148,
        104,
        75,
        217,
        8,
        131
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "profile"
          ]
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "profile.profile_name",
                "account": "profile"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "profile"
              }
            ]
          }
        },
        {
          "name": "recipient",
          "docs": [
            "Destination account that will receive the withdrawn SOL",
            "Allows the profile authority to send funds to a different address than their own",
            "Why `UncheckedAccount`:",
            "- We're only transferring SOL (no deserialization required)",
            "- We're not enforcing any constraints on it through Anchor's account validation"
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "giveLike",
      "discriminator": [
        12,
        155,
        32,
        22,
        30,
        51,
        5,
        77
      ],
      "accounts": [
        {
          "name": "liker",
          "writable": true,
          "signer": true
        },
        {
          "name": "profile",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "profile"
              }
            ]
          }
        },
        {
          "name": "like",
          "docs": [
            "Likes account to keep track of history"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "liker"
              },
              {
                "kind": "account",
                "path": "profile"
              },
              {
                "kind": "account",
                "path": "profile.like_count",
                "account": "profile"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      "name": "pauseProfile",
      "discriminator": [
        162,
        93,
        223,
        189,
        233,
        210,
        232,
        137
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "profile"
          ]
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "profile.profile_name",
                "account": "profile"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updateProfileBio",
      "discriminator": [
        161,
        103,
        169,
        237,
        158,
        226,
        201,
        102
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "profile"
          ]
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "profile.profile_name",
                "account": "profile"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "bio",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "like",
      "discriminator": [
        10,
        133,
        129,
        201,
        87,
        218,
        203,
        222
      ]
    },
    {
      "name": "profile",
      "discriminator": [
        184,
        101,
        165,
        188,
        95,
        63,
        127,
        188
      ]
    }
  ],
  "events": [
    {
      "name": "createProfileEvent",
      "discriminator": [
        45,
        65,
        156,
        5,
        108,
        56,
        175,
        40
      ]
    },
    {
      "name": "deleteProfileEvent",
      "discriminator": [
        245,
        54,
        90,
        116,
        64,
        137,
        194,
        4
      ]
    },
    {
      "name": "makeLikeEvent",
      "discriminator": [
        98,
        190,
        40,
        254,
        189,
        84,
        185,
        65
      ]
    },
    {
      "name": "pauseProfileEvent",
      "discriminator": [
        251,
        99,
        6,
        7,
        129,
        139,
        223,
        81
      ]
    },
    {
      "name": "updateProfileEvent",
      "discriminator": [
        15,
        250,
        133,
        11,
        68,
        57,
        250,
        45
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6001,
      "name": "invalidUsernameLength",
      "msg": "Invalid username length"
    },
    {
      "code": 6002,
      "name": "invalidBioLength",
      "msg": "Invalid bio length"
    },
    {
      "code": 6003,
      "name": "invalidGenderLength",
      "msg": "Invalid gender length"
    },
    {
      "code": 6004,
      "name": "invalidLookingForLength",
      "msg": "Invalid looking for length"
    },
    {
      "code": 6005,
      "name": "invalidAvatarUriLength",
      "msg": "Invalid avatar URI length"
    },
    {
      "code": 6006,
      "name": "invalidBio",
      "msg": "Invalid bio"
    },
    {
      "code": 6007,
      "name": "invalidVaultAccount",
      "msg": "Invalid vault account"
    },
    {
      "code": 6008,
      "name": "overflow",
      "msg": "overflow"
    },
    {
      "code": 6009,
      "name": "profilePaused",
      "msg": "Profile paused"
    }
  ],
  "types": [
    {
      "name": "createProfileEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "profileKey",
            "type": "pubkey"
          },
          {
            "name": "profileName",
            "type": "string"
          },
          {
            "name": "bio",
            "type": "string"
          },
          {
            "name": "gender",
            "type": "string"
          },
          {
            "name": "lookingFor",
            "type": "string"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "deleteProfileEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "profileKey",
            "type": "pubkey"
          },
          {
            "name": "profileName",
            "type": "string"
          },
          {
            "name": "deletedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "like",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "likerKey",
            "type": "pubkey"
          },
          {
            "name": "profileKey",
            "type": "pubkey"
          },
          {
            "name": "profileName",
            "type": "string"
          },
          {
            "name": "likesInLamports",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "makeLikeEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "likerKey",
            "type": "pubkey"
          },
          {
            "name": "profileKey",
            "type": "pubkey"
          },
          {
            "name": "profileName",
            "type": "string"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "pauseProfileEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "profileKey",
            "type": "pubkey"
          },
          {
            "name": "profileName",
            "type": "string"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "profile",
      "docs": [
        "* STATE"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "profileName",
            "type": "string"
          },
          {
            "name": "bio",
            "type": "string"
          },
          {
            "name": "gender",
            "type": "string"
          },
          {
            "name": "lookingFor",
            "type": "string"
          },
          {
            "name": "avatarUri",
            "type": "string"
          },
          {
            "name": "likeCount",
            "type": "u64"
          },
          {
            "name": "likesInLamports",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "deletedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "vaultBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "updateProfileEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "profileKey",
            "type": "pubkey"
          },
          {
            "name": "profileName",
            "type": "string"
          },
          {
            "name": "bio",
            "type": "string"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
