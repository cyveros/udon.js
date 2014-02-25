;window.udon = {
    Model: (new Model()),
    Event: (new Event()),
    Flow: (new Flow()),
    Data: (new ContentProvider())
};

function Flow() {
    var self = this;

    this.settings = {
        type: "Default Flow",
        steps: [],
        current: {
            index: 0,
            innerIndex: 0,
            success: false,
            data: {}
        },
        pre: function(){
            if ( ! self.settings.debug)
                return;

            console.log('Run: ' + self.currentTaskName());

        },
        post: function(){
            if ( ! self.settings.debug)
                return;

            console.log('End: ' + self.currentTaskName());
        },
        halt: false,
        haltType: 'STOP', // or 'MOVE_ON'
        end: false,
        deepStep: 0,
        alerts: {},
        debug: false,
        persistData: (new ContentProvider())
    };

    this.currentTask = '';
    this.nextTask = '';

    this.reset = function() {
        self.setCurrentStep(0);
        self.setCurrentInnerStep(0);

        self.settings.deepStep = 0;
        //self.settings.persistData = {};
        self.settings.deepStep = 0;
        self.settings.halt = false;
        self.settings.haltType = 'STOP';
        
        return self;
    };

    this.runPreTask = function() {
        if (self.settings.pre !== undefined || self.settings.pre !== null) {
            self.settings.pre();
        }
    };

    this.runPostTask = function() {
        if (self.settings.post !== undefined || self.settings.post !== null) {
            self.settings.post();
        }
    };

    this.forward = function() {
        self.settings.halt = false;
        self.currentTask = self.nextTaskName();

        self.executeCurrentTask();

        self.setDeepStep(self.currentStep());
    };

    this.executeCurrentTask = function() {
        if (self.currentTask) {
            self.runPreTask();
            self[self.currentTask]();
            self.runPostTask();
        }
    };

    this.pause = function() {
        self.halt();

        // change current to be the next one
        // when resuming, continues
        self.currentTask = self.currentTaskName();
    };

    this.stop = function(data) {
        if (typeof(data) !== 'undefined') {
            self.data(data);
        }

        self.settings.halt = true;
        self.settings.haltType = 'STOP';
        self.alert(self.currentTask);

        if (self.currentStep() == 0)
            self.reset();
    };

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

    this.persist = function(value) {
        self.settings.persistData.push(value);
    };

    this.getData = function(key){
        return self.settings.persistData.find(key);
    };

    this.currentStep = function() {
        return self.settings.current.index;
    };

    this.incrementCurrentStep = function() {
        self.settings.current.index += 1;
    };

    this.stepLength = function() {
        return self.settings.steps.length;
    };

    this.currentInnerStepLength = function() {
        return self.settings.steps[self.currentStep()].length;
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

    this.incrementCurrentInnerStep = function() {
        self.settings.current.innerIndex += 1;
    };


    this.deepStep = function() {
        return self.settings.deepStep;
    };

    // set if necessary the deepest step ever reached
    this.setDeepStep = function(value) {
        if (value > self.settings.deepStep)
            self.settings.deepStep = value;
    };

    // check if the given step were executed
    this.hasStepExecuted = function(stepId){
        return (stepId < self.deepStep());
    };

    this.currentTaskName = function() {
        return self.settings.steps[self.currentStep()][self.currentInnerStep()];
    };

    this.nextTaskName = function(){
        if (self.stepLength() < ( 1 + self.currentStep())) {
            return false;
        }

        if (self.currentInnerStepLength() <= (1 + self.currentInnerStep())) {
            self.incrementCurrentStep();
            self.setCurrentInnerStep(0);
        } else {
            self.incrementCurrentInnerStep();
        }

        return self.settings.steps[self.currentStep()][self.currentInnerStep()];
    };

    // method to run function(s) of current step
    this.transition = function() {
        self.currentTask = self.currentTaskName();
        self.executeCurrentTask();
    };

    this.next = function(callback) {

        // if (self.settings.deepStep > self.settings.current.index) {
        //     self.settings.current.index += 1;

        //     if (typeof(callback) !== 'undefined')
        //         callback();

        //     return;
        // }

        if (typeof(callback) !== 'undefined')
            callback();

        if (self.isPaused()) {

            self.settings.haltType = 'STOP';
            self.settings.halt = false;

            self.forward();

        } else if (self.isStopped()) {

            self.settings.halt = false;
            self.transition();

        } else if (self.isFreshStart()) {
            self.transition();
        } else {
            self.forward();
        }
    }

    this.prev = function(callback) {
        // the current step is always the next step's index
        // due to successful execution of last step, we increment step index to the next
        // thus, previous is 2 step earlier
        if (self.currentStep() > 0) {
            self.setCurrentStep(self.currentStep() - 1);
            self.setCurrentInnerStep(0);

            self.settings.haltType = 'STOP';
            self.settings.halt = false;
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

    this.isPaused = function() {
        return (self.settings.halt && self.settings.haltType === 'MOVE_ON');
    };

    this.isStopped = function() {
        return (self.settings.halt && self.settings.haltType === 'STOP');
    };

    this.isFreshStart = function() {
        return (self.currentStep() == 0 && self.currentInnerStep() == 0);
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

        if (self.settings.alerts.hasOwnProperty('defaultError'))
            self.settings.alerts['defaultError'](self.settings.current.data);

        console.log('Error found: %c' + self.currentTaskName(), 'color: #FF0000');
    };

    this.all = function() {
        console.log(self.settings);
        return self.settings;
    };
}

function ContentProvider() {
    var self = this;

    this.settings = {
        data: {}
    };

    this.push = function(value) {
        self.settings.data = $.extend(self.settings.data, value);
    };

    this.find = function(key) {
        if (self.settings.data.hasOwnProperty(key))
            return self.settings.data[key];

        return false;
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
