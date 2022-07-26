// Generated by CoffeeScript 2.7.0
(function() {
  this.Fretboard = (function() {
    var $$, OSW;

    class Fretboard {
      constructor() {
        var $canvas, baseNote, prevent, update_pointer_position;
        this.resize = this.resize.bind(this);
        // @x = OSW + Math.max(0, (@canvas.width - @w)/2) # to center it
        this.draw = this.draw.bind(this);
        this.strings = (function() {
          var j, len, ref, results;
          ref = ["E4", "B3", "G3", "D3", "A2", "E2"];
          results = [];
          for (j = 0, len = ref.length; j < len; j++) {
            baseNote = ref[j];
            results.push(new GuitarString(baseNote));
          }
          return results;
        })();
        this.fret_scale = 1716;
        this.x = OSW;
        // @TODO: balance visual weight vertically
        this.y = 60;
        this.w = 1920; // not because it's my screen width
        this.h = 300;
        // NOTE: frets are defined as an X of the fret, but the width of the space between it and the *previous* fret
        // (the width of the space you can press down on to hold the string against a given fret)
        this.openFretW = OSW; //*1.8
        this.openFretX = 0;
        this.pointerX = 0;
        this.pointerY = 0;
        this.pointerDown = false;
        this.pointerOpen = false; // override @pointerFret to be open
        this.pointerBend = false;
        this.pointerFret = 0;
        this.pointerFretX = this.openFretX; // TODO: clean up redundant information/state
        this.pointerFretW = this.openFretW;
        this.pointerString = 0;
        this.pointerStringY = 0;
        this.theme = Fretboard.themes["Dark Gray"];
        this.rec_note = null;
        this.playing_notes = {};
        $canvas = $("<canvas tabindex=0 style='touch-action: pan-y'/>");
        this.canvas = $canvas[0];
        prevent = function(e) {
          e.preventDefault();
          return false;
        };
        update_pointer_position = (e) => {
          var offset;
          offset = $canvas.offset();
          this.pointerX = e.pageX - offset.left;
          this.pointerY = e.pageY - offset.top;
        };
        $$.on("pointermove", update_pointer_position);
        $canvas.on("pointerdown", (e) => {
          this.pointerDown = true;
          if (e.button === 2) {
            this.pointerOpen = true;
          }
          if (e.button === 1) {
            this.pointerBend = true;
          }
          update_pointer_position(e);
          prevent(e);
          $canvas.focus();
          $$.on("pointermove", prevent); // make it so you don't select text in the textarea when dragging from the canvas
        });
        $$.on("pointerup blur", (e) => {
          var j, len, ref, string;
          $$.off("pointermove", prevent); // but let you drag other times
          this.pointerDown = false;
          this.pointerOpen = false;
          this.pointerBend = false;
          ref = this.strings;
          for (j = 0, len = ref.length; j < len; j++) {
            string = ref[j];
            string.release();
          }
        });
        
        // @TODO: pointercancel/blur/Esc
        $canvas.on("contextmenu", prevent);
        $$.on("resize", this.resize); // :)
        setTimeout(this.resize); // :/
        setTimeout(this.resize); // :(
      }

      resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.h + this.y * 2;
        // @fret_scale = @canvas.width * 1.11
        // @fret_scale = Math.sqrt(@canvas.width) * 50
        this.fret_scale = Math.min(Math.sqrt(this.canvas.width) * 50, 2138);
      }

      draw() {
        var chord, ctx, drawBentLine, drawFingerHoldOrOpenNote, drawLine, drawVibratingString, font_size, fret, fretWs, fretXs, fret_i, fret_w, fret_x, i, j, k, key, l, len, len1, len2, mX, mY, midpointY, mx, n, n_inlays, note, note_n, note_name, o, radius, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, s, scale_highlight_layer, sh, str, sy, x, xp;
        ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        drawLine = (x1, y1, x2, y2, ss, lw) => {
          if (ss != null) {
            ctx.strokeStyle = ss;
          }
          if (lw != null) {
            ctx.lineWidth = lw;
          }
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        };
        drawBentLine = (x1, y1, x2, y2, controlPointXOffset, controlPointYOffset, ss, lw) => {
          if (ss != null) {
            ctx.strokeStyle = ss;
          }
          if (lw != null) {
            ctx.lineWidth = lw;
          }
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo((x1 + x2) / 2 + controlPointXOffset, (y1 + y2) / 2 + controlPointYOffset, x2, y2);
          ctx.stroke();
        };
        drawVibratingString = (x1, y1, x2, y2, stringAmplitudeData, ss, lw) => {
          var amplitudeToPixels, deltaAmplitude, i, index, j, maxAmplitude, nextIndex, numRenders, ref, xLength, yBend;
          amplitudeToPixels = 3;
          // limit the amplitude it's considered to be at, to keep it physically plausible,
          // especially since we're using a wah-wah effect to make it sound smoother at the starts of plucks,
          // which isn't part of the audio/PCM/amplitude data we're using, because it's straight from the synthesizer
          maxAmplitude = 0.005;
          // could do the limit in pixels instead (which could be nicer)
          ctx.save();
          numRenders = 21; // could probably afford to be smaller
          // also, my intuition here is that an odd number might avoid lining up with harmonics somewhat (when not using random sampling)
          // but it might just scale *where* it lines up / affect what frequencies resonate
          ctx.globalAlpha = 1 / numRenders; // is this technically accurate? would it be if we used additive blending?
          for (i = j = 0, ref = numRenders; (0 <= ref ? j < ref : j > ref); i = 0 <= ref ? ++j : --j) {
            xLength = x2 - x1;
            // index = ~~(Math.random() * stringAmplitudeData.length)
            index = ~~(i / numRenders * stringAmplitudeData.length);
            nextIndex = (index + 1) % stringAmplitudeData.length;
            // TODO: try using not-right-next-to-each-other indexes
            // to try to make it fuller looking
            deltaAmplitude = stringAmplitudeData[nextIndex] - stringAmplitudeData[index];
            deltaAmplitude = stringAmplitudeData[nextIndex] - stringAmplitudeData[index];
            // amplitude difference / delta, or an amplitude of sound but not the *modeled* 'position of the string' *in the synth*?
            yBend = Math.min(Math.max(deltaAmplitude, -maxAmplitude), maxAmplitude) * amplitudeToPixels * xLength;
            drawBentLine(x1, y1, x2, y2, 0, yBend, ss, lw);
          }
          ctx.restore();
        };
        drawFingerHoldOrOpenNote = (fretX, fretW, stringY, stringHeight, stringBendY = 0) => {
          ctx.beginPath();
          if (fretX !== this.openFretX) {
            // ctx.ellipse(
            // 	fretX - fretW/2 # center x
            // 	stringY + stringBendY # center y
            // 	stringHeight*0.5 # radius x
            // 	stringHeight*0.4 # radius y
            // 	0 # rotation
            // 	0, Math.PI * 2 # start, end
            // )
            ctx.fillRect(fretX + 5 - fretW, stringY - stringHeight / 2, fretW - 5, stringHeight);
          }
          ctx.fillRect(fretX - 5, stringY - stringHeight / 2, 10, stringHeight);
          ctx.fill();
        };
        ctx.save();
        ctx.translate(this.x, this.y);
        mX = this.pointerX - this.x;
        mY = this.pointerY - this.y;
        if (!this.pointerBend) {
          this.pointerFret = 0;
          this.pointerFretX = this.openFretX;
          this.pointerFretW = this.openFretW;
        }
        
        // draw board
        ctx.fillStyle = this.theme.fretboard_side;
        ctx.fillRect(0, this.h * 0.1, this.w, this.h);
        ctx.fillStyle = this.theme.fretboard;
        ctx.fillRect(0, 0, this.w, this.h);
        
        // check if @pointer is over the fretboard (or Open Strings area)
        ctx.beginPath();
        ctx.rect(-OSW, 0, this.w + OSW, this.h);
        this.pointerOverFB = ctx.isPointInPath(this.pointerX, this.pointerY);
        
        // draw frets
        fretXs = [this.openFretX];
        fretWs = [this.openFretW];
        x = 0;
        xp = 0;
        fret = 1;
        while (fret < this.num_frets) {
          x += (this.fret_scale - x) / 17.817;
          mx = (x + xp) / 2;
          if (!this.pointerBend && !this.pointerOpen && mX < x && mX >= xp) {
            this.pointerFret = fret;
            this.pointerFretX = x;
            this.pointerFretW = x - xp;
          }
          fretXs[fret] = x;
          fretWs[fret] = x - xp;
          if (this.theme.shadow !== false) {
            drawLine(x + 0.5, 0, x + 0.5, this.h, "rgba(0, 0, 0, 0.8)", 5);
          }
          drawLine(x, 0, x, this.h, this.theme.frets, 3);
          ctx.fillStyle = this.theme.inlays;
          n_inlays = this.inlays[fret - 1];
          for (i = j = 0, ref = n_inlays; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
            // i for inlay of course
            ctx.beginPath();
            ctx.arc(mx, (i + 1 / 2) / n_inlays * this.h, 7, 0, tau, false);
            ctx.fill();
          }
          // ctx.fillRect(mx, Math.cos(mx)*@h, 5, 5) # faux microtonal aesthetic
          xp = x;
          fret++;
        }
        
        // TODO: base the drawing of the strings off of the state of the strings only
        // vibrating only after the furthest to the right finger hold
        // so playback visualization makes physical sense (esp. when playing back and playing via the fretboard at the same time and bending)
        // (and possibly model multiple finger holds in the string state so that it can draw between bent holds before the rightmost finger hold even tho they'd be ineffectual)
        // and TODO: change the pitch of the synth when you release a note (to open, or the nearest remaining finger hold) (without reactuating, i.e. a pull-off (and not a flick-off))

        // draw strings
        sh = this.h / this.strings.length;
        if (!this.pointerBend) { // (don't switch strings while bending)
          this.pointerString = Math.floor(mY / sh);
          this.pointerStringY = (this.pointerString + 1 / 2) * sh;
        }
        ref1 = this.strings;
        for (s = k = 0, len = ref1.length; k < len; s = ++k) {
          str = ref1[s];
          sy = (s + 1 / 2) * sh;
          if (this.pointerOverFB && s === this.pointerString) {
            midpointY = (this.pointerDown && this.pointerBend ? mY : sy);
            drawLine(0, sy, this.pointerFretX, midpointY, this.theme.strings, s / 3 + 1);
            drawVibratingString(this.pointerFretX, midpointY, this.w, sy, str.data, "rgba(150, 255, 0, 0.8)", (s / 3 + 1) * 2);
          } else {
            drawLine(0, sy, this.w, sy, this.theme.strings, s / 3 + 1);
          }
          ctx.font = "25px Helvetica";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#000";
          ctx.fillText(str.label, -OSW / 2, sy);
        }
        if (this.pointerOverFB && (0 <= (ref2 = this.pointerString) && ref2 < this.strings.length)) {
          if (this.pointerDown) {
            ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
            if (!(((ref3 = this.rec_note) != null ? ref3.f : void 0) === this.pointerFret && ((ref4 = this.rec_note) != null ? ref4.s : void 0) === this.pointerString)) {
              song.addNote(this.rec_note = {
                s: this.pointerString,
                f: this.pointerFret
              });
              this.strings[this.pointerString].play(this.pointerFret);
            } else if (this.pointerBend) {
              this.strings[this.pointerString].bend(abs(mY - this.pointerStringY));
            }
          } else {
            ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
            this.rec_note = null;
          }
          drawFingerHoldOrOpenNote(this.pointerFretX, this.pointerFretW, this.pointerStringY, sh, (this.pointerBend ? mY - this.pointerStringY : 0));
        }
        ref5 = this.playing_notes;
        
        // draw notes being played back from the tablature / recorded song
        for (key in ref5) {
          chord = ref5[key];
          for (i in chord) {
            note = chord[i];
            sy = (note.s + 1 / 2) * sh;
            ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
            drawFingerHoldOrOpenNote(fretXs[note.f], fretWs[note.f], sy, sh);
            drawVibratingString(fretXs[note.f], sy, this.w, sy, this.strings[note.s].data, "rgba(0, 255, 255, 0.8)", (note.s / 3 + 1) * 2);
          }
        }
        ref6 = ["background", "text"];
        for (l = 0, len1 = ref6.length; l < len1; l++) {
          scale_highlight_layer = ref6[l];
          ref7 = this.strings;
          for (s = n = 0, len2 = ref7.length; n < len2; s = ++n) {
            str = ref7[s];
            sy = (s + 1 / 2) * sh;
            for (fret_i = o = 0, ref8 = fretXs.length; (0 <= ref8 ? o <= ref8 : o >= ref8); fret_i = 0 <= ref8 ? ++o : --o) {
              note_n = str.base_note_n + fret_i;
              fret_x = fretXs[fret_i];
              fret_w = fretWs[fret_i];
              if (is_midi_value_in_scale(note_n)) {
                switch (scale_highlight_layer) {
                  case "background":
                    ctx.beginPath();
                    radius = sh * (fret_i < 20 ? 0.3 : 0.25);
                    ctx.arc(fret_x - fret_w / 2, sy, radius, 0, Math.PI * 2);
                    ctx.fillStyle = this.theme.scale_highlight_note_background || "white";
                    ctx.fill();
                    break;
                  case "text":
                    ctx.beginPath();
                    font_size = fret_i === 0 ? 25 : fret_i < 20 ? 20 : 15;
                    ctx.font = `${font_size}px Helvetica`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = this.theme.scale_highlight_note_text || "black";
                    // TODO: investigate, why is it fromKey that works, rather than fromMIDI?
                    note_name = teoria.note.fromKey(note_n).toString(true).replace(/^[a-g]/, (function(m) {
                      return m.toUpperCase();
                    })).replace("#", "♯").replace("b", "♭");
                    ctx.fillText(note_name, fret_x - fret_w / 2, sy);
                }
              }
            }
          }
        }
        return ctx.restore();
      }

    };

    OSW = 60; // Open Strings area Width (left of the fretboard)

    $$ = $(window);

    Fretboard.prototype.num_frets = 40;

    // inlays: (~~(Math.random() * 4) for [0..40])
    // inlays: [3, 0, 1, 1, 1, 1, 0, 3, 0, 3, 3, 1, 3, 2, 1, 2, 0, 0, 3, 0, 2, 1, 0, 0, 2, 0, 2, 1, 2, 2, 3, 0, 2, 0, 1, 1, 2, 2, 2, 0, 1]
    // inlays: [2, 3, 1, 0, 1, 2, 3, 2, 1, 0, 0, 5, 0, 0, 1, 2, 0, 3, 0, 2, 1, 0, 0, 5, 0, 0, 1, 2, 0, 3, 0, 2, 1, 0, 0] # rad dots, yo
    Fretboard.prototype.inlays = [
      0,
      0,
      1,
      0,
      1,
      0,
      1,
      0,
      1,
      0,
      0,
      2,
      0,
      0,
      1,
      0,
      1,
      0,
      1,
      0,
      1,
      0,
      0,
      2 // most common
    ];

    // inlays: [0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 2, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 2] # less common
    Fretboard.themes = {
      "Tan Classic": {
        fretboard: "#F3E08C",
        fretboard_side: "#FFF7B2",
        inlays: "#FFF",
        frets: "#444",
        strings: "#555",
        shadow: false,
        scale_highlight_note_background: "green",
        scale_highlight_note_text: "white"
      },
      "Tan": {
        fretboard: "#F3E08C",
        fretboard_side: "#FFF7B2",
        inlays: "#FFF",
        frets: "#ddd",
        strings: "#555",
        scale_highlight_note_background: "green",
        scale_highlight_note_text: "white"
      },
      "Orange": {
        fretboard: "#E8B16B",
        fretboard_side: "#F7CC97",
        inlays: "#FFF",
        frets: "#ddd",
        strings: "#555",
        scale_highlight_note_background: "orangered",
        scale_highlight_note_text: "white"
      },
      "Dark Gray": {
        fretboard: "#333",
        fretboard_side: "#222",
        inlays: "#FFF",
        frets: "lightgray",
        strings: "#777",
        scale_highlight_note_background: "#555",
        scale_highlight_note_text: "white"
      },
      "Tinted Dark": {
        fretboard: "#433",
        fretboard_side: "#322",
        inlays: "#FFF",
        frets: "lightgray",
        strings: "#777",
        scale_highlight_note_background: "black",
        scale_highlight_note_text: "white"
      },
      "Gilded Dark": {
        fretboard: "#381411",
        fretboard_side: "#1C0000",
        inlays: "#FFF",
        frets: "#EAE8C2",
        strings: "#E0DC98",
        scale_highlight_note_background: "black",
        scale_highlight_note_text: "#FFFFAA"
      }
    };

    return Fretboard;

  }).call(this);

}).call(this);
