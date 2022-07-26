// Generated by CoffeeScript 2.7.0
(function() {
  var GuitarString, GuitarStringProcessor, PLAYING_DECAY, RELEASED_DECAY, getFrequency, getNoteN, notes;

  PLAYING_DECAY = 0.00001;

  RELEASED_DECAY = PLAYING_DECAY * 20;

  notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];

  getFrequency = function(noten) {
    return 440 * 2 ** ((noten - 49) / notes.length);
  };

  getNoteN = function(notestr) {
    var i, octave;
    i = notes.indexOf(notestr.slice(0, -1));
    octave = parseInt(notestr.slice(-1));
    if (i >= notes.indexOf('C')) {
      octave -= 1;
    }
    return octave * notes.length + i + 1;
  };

  // PLAYING_DECAY = 0.1
  // RELEASED_DECAY = 0.8
  GuitarString = class GuitarString {
    constructor(base_note_str) {
      this.base_note_str = base_note_str;
      this.label = this.base_note_str[0];
      this.base_note_n = getNoteN(this.base_note_str);
      this.base_freq = getFrequency(this.base_note_n);
      this.node = new AudioWorkletNode(actx, "guitar-string-processor", {
        processorOptions: {
          baseNote: this.base_note_str
        }
      });
      this.node.connect(pre);
      this.data = [0];
      this.started = false;
      this.playing = false;
      this.freq = this.base_freq;
      this.fret = 0;
    }

    play(fret) {
      var note_n;
      this.fret = fret;
      note_n = this.base_note_n + this.fret;
      this.started = true;
      this.playing = true;
      this.periodIndex = 0;
      this.cumulativeIndex = 0;
      this.decay = (note_n / 80) + 0.1;
      this.current = 0;
      this.setFrequency(getFrequency(note_n), note_n);
    }

    setFrequency(freq) {
      var old_period, ref;
      this.freq = freq;
      this.N = Math.round(actx.sampleRate / this.freq);
      if (((ref = this.period) != null ? ref.length : void 0) !== this.N) {
        old_period = this.period;
        this.period = new Float32Array(this.N);
        this.periodIndex %= this.N; //+ 1
        this.cumulativeIndex %= this.N; //+ 1
        // @periodIndex = 0
        // @cumulativeIndex = 0
        if (old_period != null) {
          this.period.set(old_period.subarray(0, this.N));
        }
      }
    }

    // @decay = (note_n / 80) + 0.1
    // @current = 0
    bend(bend) {
      var note_n;
      // FIXME/TODO: should be a smooth glissando
      // maybe make the @period the max that it needs to be (either in general for all time, or during a transition)
      // and transition between treating it one length to a new length?
      note_n = this.base_note_n + this.fret;
      this.setFrequency(getFrequency(note_n) + bend, note_n);
    }

    release() {
      return this.playing = false;
    }

    stop() {
      this.playing = false;
      return this.started = false;
    }

  };

  if (typeof registerProcessor !== "undefined" && registerProcessor !== null) {
    GuitarStringProcessor = class GuitarStringProcessor extends AudioWorkletProcessor {
      constructor({processorOptions}) {
        super();
        this.base_note_str = processorOptions.baseNote;
        this.base_note_n = getNoteN(this.base_note_str);
        this.base_freq = getFrequency(this.base_note_n);
        this.data = [0];
        this.started = false;
        this.playing = false;
        this.freq = this.base_freq;
        this.fret = 0;
        this.setFrequency(this.base_freq);
      }

      process(inputs, outputs, parameters) {
        var channel, i, j, k, len, output, ref;
        output = outputs[0];
        if (Math.random() < 0.05) {
          this.play(0);
        }
        for (j = 0, len = output.length; j < len; j++) {
          channel = output[j];
          for (i = k = 0, ref = channel.length; (0 <= ref ? k <= ref : k >= ref); i = 0 <= ref ? ++k : --k) {
            channel[i] = this.nextSample();
          }
        }
        return true;
      }

      play(fret) {
        var note_n;
        this.fret = fret;
        note_n = this.base_note_n + this.fret;
        this.started = true;
        this.playing = true;
        this.periodIndex = 0;
        this.cumulativeIndex = 0;
        this.decay = (note_n / 80) + 0.1;
        this.current = 0;
        this.setFrequency(getFrequency(note_n), note_n);
      }

      setFrequency(freq) {
        var old_period, ref;
        this.freq = freq;
        this.N = Math.round(sampleRate / this.freq);
        if (((ref = this.period) != null ? ref.length : void 0) !== this.N) {
          old_period = this.period;
          this.period = new Float32Array(this.N);
          this.periodIndex %= this.N; //+ 1
          this.cumulativeIndex %= this.N; //+ 1
          // @periodIndex = 0
          // @cumulativeIndex = 0
          if (old_period != null) {
            this.period.set(old_period.subarray(0, this.N));
          }
        }
      }

      // @decay = (note_n / 80) + 0.1
      // @current = 0
      nextSample() {
        if (this.periodIndex === this.N) {
          this.periodIndex = 0;
        }
        if (this.cumulativeIndex < this.N) {
          this.period[this.periodIndex] += (Math.random() - Math.random()) / 4;
        }
        this.current += (this.period[this.periodIndex] - this.current) * this.decay;
        this.period[this.periodIndex] = this.current;
        // @period[@periodIndex] = @current * (1 - @decay * Math.random())
        // @period[@periodIndex] = @current * (1 - @decay/5 * Math.random())
        // @period[@periodIndex] = if Math.random() < 0.5 then @current else -@current
        ++this.periodIndex;
        ++this.cumulativeIndex;
        this.decay *= this.playing ? 1 - PLAYING_DECAY : 1 - RELEASED_DECAY;
        // @decay = if @playing then (1 - PLAYING_DECAY) else (1 - RELEASED_DECAY)
        if (!isFinite(this.current)) {
          throw new Error(`@current is ${this.current}`);
        }
        return this.current;
      }

    };
    registerProcessor('guitar-string-processor', GuitarStringProcessor);
  } else {
    this.GuitarString = GuitarString;
  }

  // class GuitarStringProcessor extends AudioWorkletProcessor

}).call(this);
