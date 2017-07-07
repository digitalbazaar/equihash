/*********************************************************************
 * NAN - Native Abstractions for Node.js
 *
 * Copyright (c) 2017 NAN contributors
 *
 * MIT License <https://github.com/nodejs/nan/blob/master/LICENSE.md>
 ********************************************************************/

#ifndef EQUIHASH_KHOVRATOVICH_ADDON_H_
#define EQUIHASH_KHOVRATOVICH_ADDON_H_

#include <nan.h>

NAN_METHOD(CreateProof);
NAN_METHOD(FindProof);
NAN_METHOD(TestProof);

#endif  // EQUIHASH_KHOVRATOVICH_ADDON_H_
