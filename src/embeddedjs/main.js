import "./radar";

// Keeping a Touch sensor subscribed allows screen taps to wake the backlight
// on Pebble Time 2 and Pebble Round 2. Radar controls remain button-based.
const touch = new device.sensor.Touch({
  onSample() {
    // Consume the sample so touch remains active without changing radar state.
    this.sample();
  },
});

// Retain the subscription for the lifetime of the app.
void touch;
