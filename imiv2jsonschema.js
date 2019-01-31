const parse = require("imiv-parser").parse;

// IMIV のパースと enrichment
const vparse = function(imiv) {
  const prefix = {};
  const dig = function(a) {
    a.restriction = a.restriction || [];
    a.restriction.forEach(b => {
      dig(b);
      if (b.type === "type") a.typeRestriction = b.pname;
    });
    if (a.prefix && a.name && prefix[a.prefix]) a.pname = `${a.prefix}:${a.name}`;
    if (a.class) dig(a.class);
    if (a.property) dig(a.property);
    if (a.next) dig(a.next);
    return a;
  };
  return parse(imiv).map(a => {
    a.metadata = a.metadata || [];
    a.metadata.filter(b => b.type === "prefix").forEach(b => {
      prefix[b.prefix] = b.data;
    });
    return dig(a);
  });
};

const isDatatype = (pname) => !!(["xsd:", "uncefact", "ic:電話番号型"].find(a => pname.indexOf(a) === 0));


module.exports = function(vocab) {
  const v = typeof vocab === "string" ? vparse(vocab) : vocab;
  v.filter(a => a.type === "class").forEach(a => {
    a.is = [];
    for (let f = a; f;) {
      a.is.push(f.pname);
      f = f.typeRestriction ? v.find(b => b.pname === f.typeRestriction) : null;
    }
  });

  // スキーマのひな型
  const schema = {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "definitions": {
      "_literal": {
        "anyOf": [{
          "type": "string"
        }, {
          "type": "object",
          "properties": {
            "@value": {
              "type": "string"
            },
            "@type": {
              "type": "string"
            },
            "@language": {
              "type": "string"
            }
          },
          "additionalProperties": false,
          "required": ["@value"]
        }]
      },
      "literal": {
        "anyOf": [{
            "$ref": "#/definitions/_literal"
          },
          {
            "type": "array",
            "items": {
              "$ref": "#/definitions/_literal"
            }
          }
        ]
      },
      "classes": {
        "anyOf": []
      }
    },
    "oneOf": [{
        "type": "object",
        "properties": {
          "@context": {
            "type": "string",
            "enum": ["https://imi.go.jp/ns/core/context.jsonld"]
          },
          "@graph": {
            "type": "array",
            "items": {
              "$ref": "#/definitions/classes"
            }
          }
        },
        "required": ["@graph", "@context"],
        "additionalProperties": false
      },
      {
        "$ref": "#/definitions/classes"
      }
    ]
  };

  // 全クラスに対してスキャンその１
  v.filter(a => a.type === "class").forEach(a => {
    const anyOf = [];

    // Object が URI であるパターン
    anyOf.push({
      "type": "string"
    }, {
      "type": "object",
      "properties": {
        "@id": {
          "type": "string"
        }
      },
      "required": ["@id"],
      "additionalProperties": false
    });
    // 所与のクラスとそこからの派生クラスをピックアップ
    v.filter(b => b.type === "class" && b.is.indexOf(a.pname) !== -1).forEach(b => {
      anyOf.push({
        "$ref": "#/definitions/" + b.pname
      })
    });
    // URI または所与のクラスまたは派生クラスのいずれか指定する条件
    schema.definitions["__" + a.pname] = {
      "anyOf": anyOf
    };
    // URI または所与のクラスまたは派生クラスいずれか、または混在する配列を指定する条件
    schema.definitions["_" + a.pname] = {
      "oneOf": [{
        "$ref": "#/definitions/__" + a.pname
      }, {
        "type": "array",
        "items": {
          "$ref": "#/definitions/__" + a.pname
        }
      }]
    };
  });

  // 全クラスに対してスキャンその2
  v.filter(a => a.type === "class").forEach(a => {
    const definition = {
      "type": "object",
      "properties": {
        "@context": {
          "type": "string",
          "enum": ["https://imi.go.jp/ns/core/context.jsonld"]
        },
        "@type": {
          "type": "string",
          "enum": [a.name]
        },
        "@id": {
          "type": "string"
        }
      },
      "required": ["@type"],
      "additionalProperties": false
    };

    a.is.forEach(focus => {
      v.filter(b => b.class && b.class.pname === focus).forEach(b => {
        v.filter(p => p.pname === b.property.pname).forEach(p => {
          if (isDatatype(p.typeRestriction)) {
            definition.properties[p.name] = {
              "$ref": "#/definitions/literal"
            };
          } else {
            definition.properties[p.name] = {
              "$ref": "#/definitions/_" + p.typeRestriction
            };
          }
        });
      });
    });

    const key = a.pname;
    // クラス一覧に登録
    schema.definitions.classes.anyOf.push({
      "$ref": "#/definitions/" + key
    });
    // 構造化データのためのスキーマを登録
    schema.definitions[key] = definition;
  });

  return schema;
};
