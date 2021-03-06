import Evented from '@ember/object/evented';
import EmberObject from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import { task, waitForQueue, waitForEvent } from 'ember-concurrency';

const EventedObject = EmberObject.extend(Evented);

module('Unit: test waitForQueue and waitForEvent', function() {
  test('waitForQueue works', function(assert) {
    assert.expect(2);

    let taskCompleted = false;
    const Obj = EmberObject.extend({
      task: task(function*() {
        yield waitForQueue('afterRender');
        taskCompleted = true;
      })
    });

    run(() => {
      let obj = Obj.create();
      obj.get('task').perform();
      assert.notOk(taskCompleted, 'Task should not have completed');
    });

    assert.ok(taskCompleted, 'Task should have completed');
  });

  test('cancelling waitForQueue works', function(assert) {
    assert.expect(2);

    let taskCompleted = false;
    const Obj = EmberObject.extend({
      task: task(function*() {
        yield waitForQueue('afterRender');
        taskCompleted = true;
      })
    });

    run(() => {
      let obj = Obj.create();
      obj.get('task').perform();
      assert.notOk(taskCompleted, 'Task should not have completed');
      obj.get('task').cancelAll();
    });

    assert.notOk(taskCompleted, 'Task should not have completed');
  });

  test('waitForEvent works (`Ember.Evented` interface)', function(assert) {
    assert.expect(4);
    let taskCompleted = false;
    const Obj = EventedObject.extend({
      task: task(function*() {
        let value = yield waitForEvent(this, 'foo');
        assert.equal(value, 123);
        taskCompleted = true;
      })
    });

    let obj;
    run(() => {
      obj = Obj.create();
      obj.get('task').perform();
    });

    run(() => {
      assert.notOk(taskCompleted, 'Task should not have completed');
      assert.ok(obj.has('foo'), 'Object has the event listener');
      obj.trigger('foo', 123);
    });

    assert.ok(taskCompleted, 'Task should have completed');
  });

  test('canceling waitForEvent works (`Ember.Evented` interface)', function(assert) {
    assert.expect(4);
    let taskCompleted = false;
    const Obj = EventedObject.extend({
      task: task(function*() {
        yield waitForEvent(this, 'foo');
        taskCompleted = true;
      })
    });

    let obj;
    run(() => {
      obj = Obj.create();
      obj.get('task').perform();
    });

    run(() => {
      assert.notOk(taskCompleted, 'Task should not have completed');
      assert.ok(obj.has('foo'), 'Object has the event listener');
      obj.get('task').cancelAll();
      obj.trigger('foo');
    });

    assert.notOk(obj.has('foo'), 'Object does not have the event listener');
    assert.notOk(taskCompleted, 'Task should not have completed');
  });

  test('waitForEvent works (DOM `EventTarget` interface)', function(assert) {
    assert.expect(3);

    const element = document.createElement('button');
    let taskCompleted = false;
    let obj;

    const Obj = EventedObject.extend({
      task: task(function*() {
        let { detail } = yield waitForEvent(element, 'foo');
        assert.equal(detail, 123);
        taskCompleted = true;
      })
    });

    run(() => {
      obj = Obj.create();
      obj.get('task').perform();
    });

    run(() => {
      assert.notOk(taskCompleted, 'Task should not have completed');
      element.dispatchEvent(new CustomEvent('foo', { detail: 123 }));
    });

    assert.ok(taskCompleted, 'Task should have completed');
  });

  test('canceling waitForEvent works (DOM `EventTarget` interface)', function(assert) {
    assert.expect(3);

    const element = document.createElement('button');
    element.removeEventListener = (...args) => {
      removeEventListenerCalled = true;
      return HTMLElement.prototype.removeEventListener.apply(element, args);
    };
    let taskCompleted = false;
    let removeEventListenerCalled = false;
    let obj;

    const Obj = EventedObject.extend({
      task: task(function*() {
        yield waitForEvent(element, 'foo');
        taskCompleted = true;
      })
    });

    run(() => {
      obj = Obj.create();
      obj.get('task').perform();
    });

    run(() => {
      assert.notOk(taskCompleted, 'Task should not have completed');
      obj.get('task').cancelAll();
      element.dispatchEvent(new CustomEvent('foo'));
    });

    assert.ok(removeEventListenerCalled, '`removeEventListener` was called');
    assert.notOk(taskCompleted, 'Task should not have completed');
  });
});
