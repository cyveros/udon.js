;window.udon = {
    Model: (new Model()),
    Event: (new Event()),
    Flow: (new Flow()),
    Route: (new Route())
};

function Route() {
    this.settings = {

    };
}

function Flow() {
    this.settings = {
        type: "Default Flow",
        steps: [],
        current: {
            index: 0,
            innerIndex: 0,
            success: false,
            data: {}
        },
        halt: false,
        haltType: 'STOP', // or 'MOVE_ON'
        end: false,
        deepStep: 0,
        alerts: {}
    };

    var self = this;

    this.EXIT = false;
    this.CLEAR = true;

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

    this.data = function(value) {
        self.settings.current.data = value;
    };

    this.currentStep = function(index) {
        return self.settings.current.index;
    };

    this.setCurrentStep = function(value) {
        self.settings.current.index = value;
    };

    this.currentInnerStep = function(){
        return self.settings.current.innerIndex;
    };

    this.setCurrentInnerStep = function(value) {
        self.settings.current.innerIndex = value;
    };

    this.deepStep = function() {
        return self.settings.deepStep;
    };

    // set if necessary the deepest step ever reached
    this.setDeepStep = function(value) {
        if (value > self.settings.deepStep)
            self.settings.deepStep = value;
    };

    // method to run function(s) of current step
    this.transition = function(stepIndex) {

        var innerSuccess = true,
            allTasks     = self.settings.steps,
            tasks;

        for(var i = stepIndex; i < allTasks.length; i++) {
            self.settings.current.index = i;
            tasks = self.settings.steps[i];

            for(var j = self.settings.current.innerIndex; j < tasks.length; j++){

                innerSuccess = self[tasks[j]]();

                if ( ! innerSuccess) {
                    self.settings.halt = true;
                    self.alert(tasks[j]);
                    break;
                }

                self.settings.halt = false;

                if (self.hasNextInner())
                    self.settings.current.innerIndex++;
            }

            if (i > self.settings.deepStep)
                self.settings.deepStep = i;

            // stop to move on to next step if halt (error in previous step)
            if (self.settings.halt)
                break;

            // reset sub steps' index
            self.settings.current.innerIndex = 0;
        }
        
    };

    this.next = function(callback) {

        if (self.settings.deepStep > self.settings.current.index) {
            self.settings.current.index += 1;

            if (typeof(callback) !== 'undefined')
                callback();

            return;
        }

        if (self.settings.current.index === 0) {
            self.transition(self.settings.current.index);
        } else if (self.settings.halt && self.settings.haltType === 'MOVE_ON') {
            // resume the previous
            var tasks = self.settings.steps[self.settings.current.index];

            if (tasks.length > ( self.settings.current.innerIndex + 1)) {
                self.settings.current.innerIndex += 1;
            } else {
                self.settings.current.index += 1;
                self.settings.current.innerIndex = 0;
            }

            self.settings.haltType = 'STOP';

            self.transition(self.settings.current.index);

        } else if (self.settings.current.success && self.hasNext()) {
            self.settings.current.index += 1;
            self.transition(self.settings.current.index);
        } else {
            self.settings.end = true;
        }
    }

    this.prev = function(callback) {
        if (self.settings.current.index > 0) {
            self.settings.current.index -= 1;
        }

        if (typeof(callback) !== 'undefined')
            callback();
    };

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

    this.isHalt = function() {
        return self.settings.halt;
    };

    this.halt = function() {
        self.settings.halt = true;
        self.settings.haltType = 'MOVE_ON';
    };

    this.alert = function(callbackName) {
        // manual halt should not trigger error handling
        if (self.settings.halt && self.settings.haltType === 'MOVE_ON')
            return;

        if (self.settings.alerts.hasOwnProperty(callbackName))
            self.settings.alerts[callbackName](self.settings.current.data);
        else if (self.settings.alerts.hasOwnProperty('default'))
            self.settings.alerts['default'](self.settings.current.data);
        else
            console.log('Error found');
    };

    this.all = function() {
        console.log(self.settings);
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

// var m2fail = {};
// m2fail.abc = function() {
//                     console.log("m2 encounter an error! or failure");
//                     $('body').css('background', '#000');
//                 };

// function asda() {}
// // example usage
//  $(document).ready(function(){
      
//         var f2 = FLS.Flow.extend({
//             steps: [
//                 {
//                     m2: function() {
//                         console.log('m2');
//                         return false;
//                     },
//                     m3: function() {
//                         console.log('m3');
//                         return true;
//                     }
//                 },
//                 'asda'
//             ],
//             alerts: {
//                 m2: m2fail.abc
//             }
//         });
        
//         f2.next();
//         f2.all();

//         //f2.m3();

// //     var a = FLS.Model.extend({a: 1});
// //     var e = new FLS.Event.extend({
// //         model: a,
// //         events: {
// //             'click:body': function() {
// //                 console.log("you clicked body");
// //             },
// //             'click:.phonesupport': function(){
// //                 e.remove('click:body');
// //                 console.log(e.model.name());
// //             }
// //         },
// //     });
//  });
