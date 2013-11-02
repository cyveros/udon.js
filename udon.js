;window.udon = {
    Model: (new Model()),
    Event: (new Event()),
    Flow: (new Flow())
};

function Flow() {
    this.settings = {
        type: "Default Flow",
        steps: [],
        current: {
            index: 0,
            innerIndex: 0,
            success: false
        },
        halt: false,
        end: false
    };

    var self = this;

    this.extend = function(value) {
        if (typeof(value) !== 'undefined') {
            self.settings = $.extend(self.settings, value);
        }

        var tmpSteps = [];

        $.each(self.settings.steps, function(i) {
            if (tmpSteps[i] === undefined)
                tmpSteps[i] = [];

            if (typeof(self.settings.steps[i]) === 'object') {
                $.each(self.settings.steps[i], function(key, callback) {
                    self[key] = callback;
                    tmpSteps[i].push(key);
                });
            } else {
                self[self.settings.steps[i]] = window[self.settings.steps[i]];
                tmpSteps[i].push(self.settings.steps[i]); 
            }
        });


        self.settings.steps = tmpSteps;

        return self;
    };

    // method to run function(s) of current step
    this.transition = function(stepIndex) {
        var innerSuccess = true,
            tasks        = self.settings.steps[stepIndex];

        for(var i = 0; i < tasks.length; i++){
            // can resume if 
            if (i < self.settings.current.innerIndex)
                continue;

            innerSuccess = self[tasks[i]]();

            if ( ! innerSuccess) {
                self.alert(tasks[i]);
                break;
            }

            if (self.hasNextInner())
                self.settings.current.innerIndex++;
        }
    };

    this.next = function() {
        if (self.settings.current.index === 0) {
            self.transition(self.settings.current.index);
        } else if (self.settings.current.success && self.hasNext()) {
            self.settings.current.index += 1;
            self.transition(self.settings.current.index);
        } else {
            self.settings.end = true;
        }
    }

    this.hasNext = function() {
        if (self.settings.currentIndex == (self.settings.steps.length - 1)) {
            self.settings.end = true;
            return false;
        }

        return true;
    };

    this.hasNextInner = function() {
        if (self.settings.current.innerIndex == (self.settings.steps[self.settings.current.index].length - 1)) {
            return false;
        }

        return true;
    };

    this.alert = function(callbackName) {
        self.settings.alerts[callbackName]();
    };
}

function Event() {
    this.settings = {
        events: {},
        model: null
    };

    var self = this;

    this.add = function(action, callback) {
        var tmp = {};
        tmp[action] = callback;
        self.settings.events = $.extend(self.settings.events, tmp);
    };

    this.remove = function(key) {
        key = key.split(':');

        $(document).off(key[0], key[1], null);
        delete self.settings.events[key];
    };

    this.extend = function(value) {
        if (typeof(value) !== 'undefined') {
            self.settings = $.extend(self.settings, value);
        }

        self.model = self.settings.model;

        $.each(self.settings.events, function(key, callback){
            key = key.split(':');

            if (key.length > 1) {
                $(document).on(key[0], key[1], callback);
            }
        });

        return self;
    }

    this.all = function() {
        return self.settings.events;
    };
}

function IO() {
    this.settings = {
        name: "IO",
        url: "/",
        defaultMethod: "post",
        data: {},
        dataType: "JSON"
    };

    this.name = function(name) {
        if (name !== undefined && name !== null) {
            this.settings.name = name;
            return this;
        }

        return this;
    };

    this.url = function(value) {
        if (value !== undefined && value !== null) {
            this.settings.url = value;
            return this;
        }
        
        return this.settings.url;
    };

    this.method = function(value) {
        if (value !== undefined && value !== null) {
            this.settings.defaultMethod = value;
            return this;
        }
        
        return this.settings.defaultMethod;
    };

    this.data = function(value) {
        if (value !== undefined && value !== null) {
            this.settings.data = value;
            return this;
        }
        
        return this.settings.data;
    };

    this.dataType = function(value) {
        if (value !== undefined && value !== null) {
            this.settings.dataType = value;
            return this;
        }
        
        return this.settings.dataType;
    };

    this.request = function(configs) {
        if (configs !== undefined && configs !== null) {
            this.settings = $.extend(this.settings, configs);
        }

        var deferred = $.Deferred();

        $.ajax({
            url: this.settings.url,
            type: this.settings.defaultMethod,
            data: this.settings.data,
            dataType: this.settings.dataType,
            success: function(data, textStatus, jqXHR) {
                deferred.resolve(data);
            }
        });

        return (deferred.promise());
    };
} 

function Model() {
    this.settings = {
        name: "Model",
        stateNotSaved: false,
        io: (new IO()),
        params: {},
        data: {},
        updatedAt: (new Date()).getTime(),
        init: false // initialize the data from server
    };

    var self = this;

    this.set = function(params, callback) {
        this.params(params);

        // initialize model 
        this.init().then(
            function(response){
                callback(response);
            }, 
            function(error) {
                console.log("error!");
            }
            /*,
            function(cachedResponse) {
                console.log("cached");
                if (cachedResponse !== undefined && cachedResponse !== null && cachedResponse != {}) {
                    callback(cachedResponse);
                }
            }
            */
        );

        return this;
    };

    this.name = function(value) {
        if (value !== undefined && value !== null) {
            this.settings.name = value;
            return this;
        }

        return this.settings.name;
    };

    this.updatedAt = function() {
        return this.settings.updatedAt;
    };

    this.io = function(value) {
        if (value !== undefined && value !== null) {
            this.settings.io = value;
            return this;
        }

        return this.settings.io;
    };

    this.params = function(value) {
        if (value !== undefined && value !== null) {
            this.settings.params = value;
            return this;
        }
        
        return this.settings.params;
    };

    this.data = function(value) {
        if (value !== undefined && value !== null) {
            self.settings.data = $.extend(self.settings.data, value);
            return this;
        }

        return this.settings.data;
    };

    this.extend = function(value) {
        if (typeof(value) !== 'undefined') {
            self.settings = $.extend(self.settings, value);
        }

        if (self.settings.init) {
            this.init();
        }
        
        return self;

    };

    this.init = function() {

        var request = this.settings.io.method('get').request({data: this.settings.params});
        var deferred = $.Deferred();

        if ( ! this.settings.changed && request.state() == 'pending') {
            deferred.notify(this.settings.data);
            this.settings.updatedAt = (new Date()).getTime();
        }

        request.then(
            function(response){
                self.settings.data = response;
                deferred.resolve(response);
            }, 
            deferred.reject
        );

        return (deferred.promise());
    };

    this.save = function() {
        
        if (this.settings.stateNotSaved) {
            this.settings._lock = true;
            this.settings.io.method('post').request(this.settings.params, function(response) {
                if (response.status == "ok") {
                    this.settings.stateNotSaved = false;
                }
            });
        }
    };
}

var m2fail = {};
m2fail.abc = function() {
                    console.log("m2 encounter an error! or failure");
                    $('body').css('background', '#000');
                };
// example usage
 $(document).ready(function(){
      
        var f2 = udon.Flow.extend({
            steps: [
                {
                    m2: function() {
                        console.log('m2');
                        return false;
                    },
                    m3: function() {
                        console.log('m3');
                        return true;
                    }
                },
                'asda'
            ],
            alerts: {
                m2: m2fail.abc
            }
        });
        
        f2.next();
        //f2.m3();

//     var a = udon.Model.extend({a: 1});
//     var e = new udon.Event.extend({
//         model: a,
//         events: {
//             'click:body': function() {
//                 console.log("you clicked body");
//             },
//             'click:.phonesupport': function(){
//                 e.remove('click:body');
//                 console.log(e.model.name());
//             }
//         },
//     });
 });
