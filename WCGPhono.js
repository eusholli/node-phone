
(function($)
{

  // Geoff added
  var accessToken = null;
  
    // Random, unique, unpredictable
    // Both uuidCounter++ are needed and Math.random.
    // uuidCounter++ ensures unique
    // Math.random() ensures unpredictable
    // Prints it out as hex with no other punctuation (looks neater)
    var uuidCounter = 0;
    var uuid = function()
    {
        return Math.random().toString(16).substring(2) + (uuidCounter++).toString(16);
    };
    
    function PhonoCall(ms, destination, config, oCall)
    {
    
        var call = oCall;
    
        if (!call)
            call = ms.createCall(destination, {audio: true, video: true});
            
        if (!config)
            config = {};
            
        $.extend(this, config);
        
        this.state = "initial";
        var mt = this;
        
        call.onstatechange = function(e)
        {
        
            if (e.state == Call.State.RINGING && mt.onRing)
            {
                mt.onRing(e);
                mt.state = "ringing";
            }
            if (e.state == Call.State.ONGOING && mt.onAnswer)
            {
                mt.onAnswer(e);
                mt.state = "connected";
            }
            if (e.state == Call.State.ENDED && mt.onHangup)
            {
                mt.onHangup(e);
                mt.state = "disconnected";
            }
            if (e.state == Call.State.ERROR && mt.onError)
            {
                mt.onError(e);
                mt.state = "disconnected";
            }
        }
        
        call.onaddstream = function(e)
        {
            // TODO: Add the stream to an element.
            // This is not possible (nor useful) in current Chrome
            if (mt.onAddStream)
                mt.onAddStream(e);
        }   
        
        this.__defineGetter__("localStreams", function() { return call.localStreams; });
        this.__defineGetter__("remoteStreams", function() { return call.localStreams; });
        
        if (!destination)
            this.__defineGetter__("from", function() { return call.recipient; });
        
        this.id = uuid();
        this.call = call;
        
        if (!oCall)
            call.ring();
    }
    
    PhonoCall.prototype.answer = function() { this.call.answer(); };
    PhonoCall.prototype.hangup = function() { this.call.end(); };
    PhonoCall.prototype.digit = function() { };
    PhonoCall.prototype.pushToTalk = function() { };
    PhonoCall.prototype.talking = function() { };
    PhonoCall.prototype.mute = function() { };
    PhonoCall.prototype.hold = function() { };
    PhonoCall.prototype.volume = function() { };
    PhonoCall.prototype.gain = function() { };
    
    function Phone(ms, config)
    {
        this._ms = ms;
        if (!config) config = {};
        this._config = config;
        
        $.extend(this, config);
        
        if (!this.onError)
            this.onError = function(){
                console.warn("Error occurred with no handler there");
            };
    }
    
    Phone.prototype.dial = function(destination, config)
    {
        if (!config.video)
            config.video = this.video;
            
        var sipDestination = "sip:"+destination + "@" + sipdomain;
        this.call = new PhonoCall(this._ms, sipDestination, config);
        
        return this.call;
    };
    
    Phone.prototype.tones = function(){};
    Phone.prototype.headset = function(){};
    Phone.prototype.wideband = function(){};
    Phone.prototype.ringTone = function(){};
    Phone.prototype.ringbackTone = function(){};

    function WCGPhono(config)
    {
        if (!config) config = {};
        this._config = config;
        $.extend(this, config);
        
        if (!this.user)
            this.user = uuid();
            
        if (!this.server)
            this.server = "http://api.tfoundry.com/a1/webrtc";
        
        //this._ms = new MediaServices("http://api.tfoundry.com/a1/H2SConference", uuid(), config.apiKey, "audio");
        
        var mt = this;
        
        var mediaType = (config.video ? "audio,video" : "audio");
        
        
        // /* Comment out for the test case
        
        this._ms = new MediaServices(this.server, this.user, config.apiKey, mediaType);
        this._ms.onready = function() { setTimeout(function() { mt._ms.unregister(); }, 500) };
        this._ms.onclose = function() { setTimeout(function() {
        
        // */
            
            mt._ms = new MediaServices(mt.server, mt.user, config.apiKey, mediaType);
            mt._ms.turnConfig = "STUN:206.18.171.164:5060";
            
            // preserve "this" for callbacks
            mt._ms.onclose = function(e) { if (mt.onUnready) mt.onUnready(e); };
            mt._ms.onerror = function(e) { mt.onerror(e); };
            mt._ms.oninvite = function(e) { mt.oninvite(e); };
            mt._ms.onready = function(e) { mt.sessionId = mt._ms.username; if (mt.onReady) mt.onReady(e); };
            
            mt.phone = new Phone(mt._ms, config.phone);
        
        // /*
        }, 500); };
        
        // */
    }
    
    WCGPhono.prototype.onerror = function(evt)
    {
        // TODO: Ensure error event format matches
        if(this.phone._call && this.phone._call.onerror)
        {
            this.phone._call.onerror(evt);
        }
        else
        {
            this.phone.onerror(evt);
        }
    }
    
    WCGPhono.prototype.oninvite = function(evt)
    {
        if (evt.call && this.phone.onIncomingCall)
            this.phone.onIncomingCall({call: new PhonoCall(this._ms, null, null, evt.call)});
    }
    
    $.extend({wcgphono: function(cfg) { return new WCGPhono(cfg); }});

})(jQuery);
