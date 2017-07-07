/*********************************************************************
 * NAN - Native Abstractions for Node.js
 *
 * Copyright (c) 2017 NAN contributors
 *
 * MIT License <https://github.com/nodejs/nan/blob/master/LICENSE.md>
 ********************************************************************/

#include <nan.h>
#include "pow.h"  // NOLINT(build/include)
#include "async.h"  // NOLINT(build/include)

using v8::Function;
using v8::Local;
using v8::Number;
using v8::Isolate;
using v8::String;
using v8::Value;
using Nan::AsyncQueueWorker;
using Nan::AsyncWorker;
using Nan::Callback;
using Nan::HandleScope;
using Nan::New;
using Nan::Null;
using Nan::To;

class FindProofWorker : public AsyncWorker {
 public:
  FindProofWorker(Callback *callback/*, int points*/)
    : AsyncWorker(callback)/*, points(points)*/, estimate(0) {}
  ~FindProofWorker() {}

  // Executed inside the worker-thread.
  // It is not safe to access V8, or V8 data structures
  // here, so everything we need for input and output
  // should go on `this`.
  void Execute () {
    //estimate = Estimate(points);
    estimate = 222;
  }

  // Executed when the async work is complete
  // this function will be run inside the main event loop
  // so it is safe to use V8 again
  void HandleOKCallback () {
    HandleScope scope;

    Local<Value> argv[] = {
        Null()
      , New<Number>(estimate)
    };

    callback->Call(2, argv);
  }

 private:
  int points;
  double estimate;
};

// Asynchronous access to the `Estimate()` function
NAN_METHOD(CreateProof) {
   //info.GetReturnValue().Set(111);
   Isolate* isolate = info.GetIsolate();
   info.GetReturnValue().Set(String::NewFromUtf8(isolate, "world"));
}

// Asynchronous access to the `Estimate()` function
NAN_METHOD(FindProof) {
   //int points = To<int>(info[0]).FromJust();
   Callback *callback = new Callback(info[0].As<Function>());

   AsyncQueueWorker(new FindProofWorker(callback/*, points*/));
}

// Asynchronous access to the `Estimate()` function
NAN_METHOD(TestProof) {
   info.GetReturnValue().Set(333);
}
