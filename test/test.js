const generate = require("../imiv2jsonschema");
const expect = require('chai').expect;
const vocab = require('fs').readFileSync(__dirname + "/imicore241.imiv.txt", "UTF-8");
const JSONSchemaValidator = require('jsonschema').Validator;

const validator = (schema) => {
  return function(instance) {
    return (new JSONSchemaValidator()).validate(instance, schema).errors;
  };
};

describe('imiv2jsonschema', function() {

  describe('クラス', function() {
    const schema = generate(`
#prefix ex: "http://example.org/"
vocabulary "http://example.org/" ;
class ex:Animal;
class ex:Cat{@ex:Animal};
`);
    //    console.log(JSON.stringify(schema, null, 2));
    const validate = validator(schema);

    it('基底クラスがエラーにならないこと', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Animal"
      })).to.be.empty;
    });
    it('通常クラスがエラーにならないこと', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat"
      })).to.be.empty;
    });
    it('存在しないクラスがエラーになること', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Dog"
      })).not.to.be.empty;

    });
  });

  describe('データタイププロパティ', function() {
    const schema = generate(`
#prefix xsd: "http://www.w3.org/2001/XMLSchema#"
#prefix ex: "http://example.org/"
vocabulary "http://example.org/" ;
class ex:Animal;
class ex:Cat{@ex:Animal};
class ex:Neko{@ex:Cat};
property ex:say{@xsd:string};
set ex:Cat>ex:say;
`);
    //    console.log(JSON.stringify(schema, null, 2));
    const validate = validator(schema);

    it('直接付与されたプロパティがエラーにならないこと', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "say": "hello"
      })).to.be.empty;
    });

    it('継承元クラスに付与されたプロパティがエラーにならないこと', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Neko",
        "say": "hello"
      })).to.be.empty;
    });

    it('使用できないプロパティはエラーになること', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Animal",
        "say": "hello"
      })).not.to.be.empty;
    });
  });

  describe('オブジェクトプロパティ', function() {
    const schema = generate(`
#prefix xsd: "http://www.w3.org/2001/XMLSchema#"
#prefix ex: "http://example.org/"
vocabulary "http://example.org/" ;
class ex:Animal;
class ex:Cat{@ex:Animal};
class ex:Neko{@ex:Cat};
property ex:knows{@ex:Cat};
set ex:Cat>ex:knows;
`);
    //    console.log(JSON.stringify(schema, null, 2));
    const validate = validator(schema);

    it('クラスからクラスへの参照がエラーにならないこと', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "knows": {
          "@type": "Cat"
        }
      })).to.be.empty;
    });

    it('クラスから継承クラスへの参照がエラーにならないこと', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "knows": {
          "@type": "Neko"
        }
      })).to.be.empty;
    });

    it('クラスから値域外クラスへの参照がエラーになること', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "knows": {
          "@type": "Animal"
        }
      })).not.to.be.empty;
    });

  });

  describe('コア語彙', function() {
    const schema = generate(vocab);
    const validate = validator(schema);

    it('コア語彙の JSON Schema が生成でき、valid なインスタンスを valid と判定できること', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "場所型",
        "表記": "東京タワー",
        "地理座標": {
          "@type": "座標型",
          "緯度": "+35.0",
          "経度": "+135.0"
        }
      })).to.be.empty;
    });

    it('コア語彙の JSON Schema が生成でき、invalid なインスタンスを invalid と判定できること', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "ばしょ型",
        "表記": "東京タワー",
        "地理座標": {
          "@type": "座標型",
          "緯度": "+35.0",
          "経度": "+135.0"
        }
      })).not.to.be.empty;
    });

  });

  describe('JSON-LD', function() {
    const schema = generate(`
#prefix xsd: "http://www.w3.org/2001/XMLSchema#"
#prefix ex: "http://example.org/"
vocabulary "http://example.org/" ;
class ex:Animal;
class ex:Cat{@ex:Animal};
class ex:Neko{@ex:Cat};
property ex:say{@xsd:string};
set ex:Cat>ex:say;
`);
    //    console.log(JSON.stringify(schema, null, 2));
    const validate = validator(schema);

    it('一般リテラル', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "say": "hello"
      })).to.be.empty;
    });

    it('@value', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "say": {
          "@value": "hello"
        }
      })).to.be.empty;
    });

    it('@value+@language', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "say": {
          "@value": "hello",
          "@language": "en"
        }
      })).to.be.empty;
    });

    it('@language', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "say": {
          "@language": "en"
        }
      })).not.to.be.empty;
    });

    it('@value+@type', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "say": {
          "@value": "hello",
          "@type": "http://www.w3.org/2001/XMLSchema#string"
        }
      })).to.be.empty;
    });

    it('@type', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "say": {
          "@type": "http://www.w3.org/2001/XMLSchema#string"
        }
      })).not.to.be.empty;
    });

    it('空配列', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "say": []
      })).to.be.empty;
    });

    it('配列1', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "say": ["hello"]
      })).to.be.empty;
    });

    it('配列2', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "say": ["hello", "world"]
      })).to.be.empty;
    });

  });

  describe('クラスの混在', function() {
    const schema = generate(`
#prefix xsd: "http://www.w3.org/2001/XMLSchema#"
#prefix ex: "http://example.org/"
vocabulary "http://example.org/" ;
class ex:Animal;
class ex:Cat{@ex:Animal};
class ex:Neko{@ex:Cat};
property ex:knows{@ex:Cat};
set ex:Cat>ex:knows;
`);
    //    console.log(JSON.stringify(schema, null, 2));
    const validate = validator(schema);

    it('空配列', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "knows": []
      })).to.be.empty;
    });

    it('配列1', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "knows": [{
          "@type": "Cat"
        }]
      })).to.be.empty;
    });

    it('配列2', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "knows": [{
          "@type": "Cat"
        }, {
          "@type": "Cat"
        }]
      })).to.be.empty;
    });

    it('配列3', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "knows": [{
          "@type": "Cat"
        }, {
          "@type": "Neko"
        }]
      })).to.be.empty;
    });

    it('配列4', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "knows": [{
          "@type": "Cat"
        }, {
          "@type": "Animal"
        }]
      })).not.to.be.empty;
    });


  });

  describe('context', function() {
    const schema = generate(`
#prefix xsd: "http://www.w3.org/2001/XMLSchema#"
#prefix ex: "http://example.org/"
vocabulary "http://example.org/" ;
class ex:Animal;
class ex:Cat{@ex:Animal};
class ex:Neko{@ex:Cat};
property ex:knows{@ex:Cat};
set ex:Cat>ex:knows;
`);
    //    console.log(JSON.stringify(schema, null, 2));
    const validate = validator(schema);

    it('ルートの context は必須', function() {
      expect(validate({
        "@context": "https://imi.go.jp/ns/core/context.jsonld",
        "@type": "Cat",
        "knows": []
      })).to.be.empty;
    });

  });

});
