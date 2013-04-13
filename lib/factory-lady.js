(function() {
  var hash = {
    merge: function(obj1, obj2) {
      if(obj1 && obj2) {
        var key;
        for(key in obj2) {
          if(obj2.hasOwnProperty(key)) {
            obj1[key] = obj2[key];
          }
        }
      }
      return obj1;
    }
  , copy: function(obj) {
      var newObj = {};
      if(obj) {
        hash.merge(newObj, obj);
      }
      return newObj;
    }
  , keys: function(obj) {
      var keys = [], key;
      for(key in obj) {
        if(obj.hasOwnProperty(key)) {
         keys.push(key);
        }
      }
      return keys;
    }
  };

  var asyncForEach = function(array, handler, callback) {
    var length = array.length, index = -1;

    var processNext = function() {
      index ++;
      if(index < length) {
        var item = array[index];
        handler(item, processNext);
      } else {
        callback();
      }
    };

    processNext();
  };

  var factories = {};

  var define = function(name, model, attributes) {
    // Support extending other factories
    if (typeof name === 'object') {
      var options = name;
      name = options.name;

      var parent = options.extends || options.parent;
      var parentFactory = factories[parent];

      // Allow inheritance of models
      if (typeof attributes === 'undefined') {
        attributes = model;
        model = parentFactory.model;
      }

      var parentAttrs = hash.copy(factories[parent].attributes);
      attributes = hash.merge(parentAttrs, attributes);


    }

    factories[name] = {
      model: model
    , attributes: attributes
    };
  };

  var build = function(name, userAttrs, callback) {
    if(typeof userAttrs === 'function') {
      callback = userAttrs;
      userAttrs = {};
    }

    var model = factories[name].model;
    var attrs = hash.copy(factories[name].attributes);
    hash.merge(attrs, userAttrs);

    asyncForEach(hash.keys(attrs), function(key, cb) {
      var fn = attrs[key];
      if(typeof fn === 'function') {
        fn(function(value) {
          attrs[key] = value;
          cb();
        });
      } else {
        cb();
      }
    }, function() {
      var doc = new model();
      var key;
      for(key in attrs) {
        if(attrs.hasOwnProperty(key)) {

          // Association keys
          if (key.match(/^\$/)) {
            // Grab associated model
            associated = attrs[key];

            delete attrs[key];
            key = key.replace('$', '');

            doc[key] = associated;
            
            var idKey = key + '_id';
            doc.set(idKey, associated.id);
          }
          // Normal keys  
          else {
            // Backbone style
            doc.set(key, attrs[key]);
          }
          
          // doc[key] = attrs[key];
        }
      }
      callback(doc);
    });
  };

  var create = function(name, userAttrs, callback) {
    if(typeof userAttrs === 'function') {
      callback = userAttrs;
      userAttrs = {};
    }

    build(name, userAttrs, function(doc) {
      // Our api uses create, not save
      doc.create(function(err) {
        if(err) {
          throw err;
        }
        callback(doc);
      });
    });
  };

  var assoc = function(name, attr) {
    return function(callback) {
      create(name, callback);
      // create(name, function(doc) {
      //   if(attr) {
      //     callback(doc.get(attr) || doc[attr]);
      //   } else {
      //     callback(doc);
      //   }
      // });
    };
  };

  var Factory    = create;
  Factory.define = define;
  Factory.build  = build;
  Factory.create = create;
  Factory.assoc  = assoc;

  if(typeof module !== 'undefined' && module.exports) {
    module.exports = Factory;
  } else {
    this.Factory = Factory;
  }
}());

