/*********************************************************************
 * NAN - Native Abstractions for Node.js
 *
 * Copyright (c) 2017 NAN contributors
 *
 * MIT License <https://github.com/nodejs/nan/blob/master/LICENSE.md>
 ********************************************************************/

#include <nan.h>
//#include "addon.h"   // NOLINT(build/include)
#include "pow.h"  // NOLINT(build/include)

using Nan::AsyncQueueWorker;
using Nan::AsyncWorker;
using Nan::Callback;
using Nan::GetFunction;
using Nan::HandleScope;
using Nan::New;
using Nan::Null;
using Nan::Set;
using Nan::To;
using v8::Function;
using v8::FunctionTemplate;
using v8::Handle;
using v8::Isolate;
using v8::Local;
using v8::Number;
using v8::Object;
using v8::String;
using v8::Value;

class EquihashSolutionWorker : public AsyncWorker {
 public:
  EquihashSolutionWorker(const unsigned n, const unsigned k, Seed seed, Callback *callback)
    : AsyncWorker(callback), n(n), k(k), seed(seed) {}
  ~EquihashSolutionWorker() {}

  // Executed inside the worker-thread.
  // It is not safe to access V8, or V8 data structures
  // here, so everything we need for input and output
  // should go on `this`.
  void Execute () {
    Equihash equihash(n, k, seed);
    Proof p = equihash.FindProof();
    solution = p.inputs;
  }

  // Executed when the async work is complete
  // this function will be run inside the main event loop
  // so it is safe to use V8 again
  void HandleOKCallback () {
     HandleScope scope;
     Local<Object> obj = Nan::New<Object>();
     Local<Object> proofValue =
       Nan::CopyBuffer((const char*)&solution[0], solution.size())
         .ToLocalChecked();

     obj->Set(New("n").ToLocalChecked(), New(n));
     obj->Set(New("k").ToLocalChecked(), New(k));
     obj->Set(New("proof").ToLocalChecked(), proofValue);

     Local<Value> argv[] = {
        Null(),
        obj
     };

     callback->Call(2, argv);
  }

  private:
  unsigned n;
  unsigned k;
  Seed seed;
  std::vector<Input> solution;
};
/*
static void printhex(const char *title, const unsigned int *buf, size_t buf_len)
{
    size_t i = 0;
    fprintf(stdout, "%s\n", title);
    for(i = 0; i < buf_len; ++i)
    fprintf(stdout, "%02X%s", buf[i],
             ( i + 1 ) % 16 == 0 ? "\r\n" : " " );

}*/
NAN_METHOD(Solve) {
   // ensure first argument is an object
   if(!info[0]->IsObject()) {
      Nan::ThrowTypeError("'options' must be an object");
      return;
   }
   // ensure second argument is a callback
   if(!info[1]->IsFunction()) {
      Nan::ThrowTypeError("'callback' must be a function");
      return;
   }

   Callback *callback = new Callback(info[1].As<Function>());
   Handle<Object> object = Handle<Object>::Cast(info[0]);
   Handle<Value> nValue = object->Get(New("n").ToLocalChecked());
   Handle<Value> kValue = object->Get(New("k").ToLocalChecked());
   Handle<Value> seedValue = object->Get(New("seed").ToLocalChecked());

   const unsigned n = To<uint32_t>(nValue).FromJust();
   const unsigned k = To<uint32_t>(kValue).FromJust();
   unsigned* seedBuffer = (unsigned*)node::Buffer::Data(seedValue);
   Seed seed(seedBuffer, SEED_LENGTH);

   //printhex("seed", seedBuffer, SEED_LENGTH);

   AsyncQueueWorker(new EquihashSolutionWorker(n, k, seed, callback));
}

NAN_METHOD(Verify) {
  /*
   char* buffer = (char*) node::Buffer::Data(info[0]->ToObject());

   v8::Local<v8::Object> buf = NewBuffer(DATA_SIZE).ToLocalChecked();
   char* pbuf = node::Buffer::Data(buf);
   for (unsigned char i = 0; i < DATA_SIZE; i++) {
     pbuf[i] = 'a' + i;
   }
   info.GetReturnValue().Set(buf);
   */
   info.GetReturnValue().Set(748);
}

NAN_MODULE_INIT(InitAll) {
  Set(target, New<String>("solve").ToLocalChecked(),
    GetFunction(New<FunctionTemplate>(Solve)).ToLocalChecked());
  Set(target, New<String>("verify").ToLocalChecked(),
    GetFunction(New<FunctionTemplate>(Verify)).ToLocalChecked());
}

NODE_MODULE(addon, InitAll)
