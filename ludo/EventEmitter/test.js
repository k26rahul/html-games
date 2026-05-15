import assert from 'node:assert';
import EventEmitter from './EventEmitter.js';

function runEventEmitterTests() {
  console.log('📡 Starting EventEmitter Tests...\n');
  const emitter = new EventEmitter();

  try {
    // TEST 1: Basic on() and emit()
    let test1Value = 0;
    emitter.on('add', data => {
      test1Value += data;
    });
    emitter.emit('add', 5);
    emitter.emit('add', 10);
    assert.strictEqual(
      test1Value,
      15,
      'TEST 1 Failed: on/emit did not process data correctly.',
    );
    console.log('✅ TEST 1 Passed: Basic on() and emit()');

    // TEST 2: Multiple listeners
    let test2Value = '';
    emitter.on('concat', str => {
      test2Value += str;
    });
    emitter.on('concat', str => {
      test2Value += str.toUpperCase();
    });
    emitter.emit('concat', 'a');
    assert.strictEqual(
      test2Value,
      'aA',
      'TEST 2 Failed: Multiple listeners did not fire.',
    );
    console.log('✅ TEST 2 Passed: Multiple listeners for the same event');

    // TEST 3: off() (Unsubscribing)
    let test3Value = 0;
    const increment = () => {
      test3Value++;
    };
    emitter.on('inc', increment);
    emitter.emit('inc'); // test3Value is now 1
    emitter.off('inc', increment);
    emitter.emit('inc'); // should not fire
    assert.strictEqual(
      test3Value,
      1,
      'TEST 3 Failed: off() did not remove the listener.',
    );
    console.log('✅ TEST 3 Passed: off() unsubscribes listeners');

    // TEST 4: once() (Fires exactly once)
    let test4Value = 0;
    emitter.once('single', () => {
      test4Value++;
    });
    emitter.emit('single');
    emitter.emit('single');
    emitter.emit('single');
    assert.strictEqual(test4Value, 1, 'TEST 4 Failed: once() fired more than once.');
    console.log('✅ TEST 4 Passed: once() automatically unbinds after firing');

    // TEST 5: removeAllListeners()
    emitter.on('clean', () => {});
    emitter.on('keep', () => {});

    emitter.removeAllListeners('clean');
    assert.strictEqual(
      emitter.events['clean'],
      undefined,
      'TEST 5a Failed: Specific event not cleared.',
    );
    assert.ok(
      emitter.events['keep'],
      'TEST 5b Failed: Unrelated event was accidentally cleared.',
    );

    emitter.removeAllListeners();
    assert.deepStrictEqual(
      emitter.events,
      {},
      'TEST 5c Failed: All events were not cleared.',
    );
    console.log('✅ TEST 5 Passed: removeAllListeners() clears memory');

    console.log('\n🏁 All EventEmitter tests passed successfully!\n');
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }
}

runEventEmitterTests();
