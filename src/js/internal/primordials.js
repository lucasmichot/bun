// This file subclasses and stores the JS built-ins that come from the VM
// so that Node.js's built-in modules do not need to later look these up from
// the global proxy, which can be mutated by users.

// Use of primordials have sometimes a dramatic impact on performance, please
// benchmark all changes made in performance-sensitive areas of the codebase.
// See: https://github.com/nodejs/node/pull/38248

const primordials = $Object.$create(null);

const {
  asyncIterator: SymbolAsyncIterator,
  for: SymbolFor,
  hasInstance: SymbolHasInstance,
  isConcatSpreadable: SymbolIsConcatSpreadable,
  iterator: SymbolIterator,
  match: SymbolMatch,
  matchAll: SymbolMatchAll,
  replace: SymbolReplace,
  search: SymbolSearch,
  species: SymbolSpecies,
  split: SymbolSplit,
  toPrimitive: SymbolToPrimitive,
  toStringTag: SymbolToStringTag,
  unscopables: SymbolUnscopables,
} = Symbol;

const FinalizationRegistryPrototype = FinalizationRegistry.prototype;
const {
  register: FinalizationRegistryPrototypeRegisterRaw,
  unregister: FinalizationRegistryPrototypeUnregisterRaw,
  [SymbolToStringTag]: FinalizationRegistryPrototypeSymbolToStringTag,
} = FinalizationRegistryPrototype;

const MapPrototype = $Map.prototype;
const MapPrototypeClearRaw = MapPrototype.$clear;
const MapPrototypeDeleteRaw = MapPrototype.$delete;
const MapPrototypeEntriesRaw = MapPrototype.$entries;
const MapPrototypeForEachRaw = MapPrototype.$forEach;
const MapPrototypeGetRaw = MapPrototype.$get;
const MapPrototypeHasRaw = MapPrototype.$has;
const MapPrototypeKeysRaw = MapPrototype.$keys;
const MapPrototypeSetRaw = MapPrototype.$set;
const MapPrototypeValuesRaw = MapPrototype.$values;
const { [SymbolIterator]: MapPrototypeSymbolIteratorRaw, [SymbolToStringTag]: MapPrototypeSymbolToStringTag } =
  MapPrototype;

const {
  all: PromiseAllRaw,
  allSettled: PromiseAllSettledRaw,
  any: PromiseAnyRaw,
  race: PromiseRaceRaw,
  reject: PromiseRejectRaw,
  resolve: PromiseResolveRaw,
} = $Promise;
const PromisePrototype = $Promise.prototype;
const PromisePrototypeThenRaw = $defaultPromiseThen;
const { catch: PromisePrototypeCatchRaw, finally: PromisePrototypeFinallyRaw } = PromisePrototype;

const SetPrototype = $Set.prototype;
const SetPrototypeClearRaw = SetPrototype.$clear;
const SetPrototypeAddRaw = SetPrototype.$add;
const SetPrototypeDeleteRaw = SetPrototype.$delete;
const SetPrototypeEntriesRaw = SetPrototype.$entries;
const SetPrototypeForEachRaw = SetPrototype.$forEach;
const {
  difference: SetPrototypeDifferenceRaw,
  intersection: SetPrototypeIntersectionRaw,
  isDisjointFrom: SetPrototypeIsDisjointFromRaw,
  isSubsetOf: SetPrototypeIsSubsetOfRaw,
  isSupersetOf: SetPrototypeIsSupersetOfRaw,
  symmetricDifference: SetPrototypeSymmetricDifferenceRaw,
  union: SetPrototypeUnionRaw,
} = SetPrototype;

const SetPrototypeHasRaw = SetPrototype.$has;
const SetPrototypeKeysRaw = SetPrototype.$keys;
const SetPrototypeValuesRaw = SetPrototype.$values;
const { [SymbolIterator]: SetPrototypeSymbolIteratorRaw, [SymbolToStringTag]: SetPrototypeSymbolToStringTag } =
  SetPrototype;

const RegExpPrototype = $RegExp.prototype;
const RegExpPrototypeExecRaw = $regExpBuiltinExec;
const RegExpPrototypeSymbolMatchRaw = $regExpPrototypeSymbolMatch;
const RegExpPrototypeSymbolReplaceRaw = $regExpPrototypeSymbolReplace;
const {
  [SymbolMatchAll]: RegExpPrototypeSymbolMatchAllRaw,
  [SymbolSearch]: RegExpPrototypeSymbolSearchRaw,
  [SymbolSplit]: RegExpPrototypeSymbolSplitRaw,
} = RegExpPrototype;

const WeakMapPrototype = WeakMap.prototype;
const {
  delete: WeakMapPrototypeDeleteRaw,
  get: WeakMapPrototypeGetRaw,
  has: WeakMapPrototypeHasRaw,
  set: WeakMapPrototypeSetRaw,
  [SymbolToStringTag]: WeakMapPrototypeSymbolToStringTag,
} = WeakMapPrototype;

const WeakRefPrototype = WeakRef.prototype;
const { deref: WeakRefPrototypeDerefRaw, [SymbolToStringTag]: WeakRefPrototypeSymbolToStringTag } = WeakRefPrototype;

const WeakSetPrototype = WeakSet.prototype;
const {
  add: WeakSetPrototypeAddRaw,
  delete: WeakSetPrototypeDeleteRaw,
  has: WeakSetPrototypeHasRaw,
  [SymbolToStringTag]: WeakSetPrototypeSymbolToStringTag,
} = WeakSetPrototype;

// `uncurryNArgs` is equivalent to `func => Function.prototype.call.bind(func)`.
// biome-ignore format:
const uncurryNArgs = fn => (thisArg, ...args) => fn.$apply(thisArg, args);
primordials.uncurryThis = uncurryNArgs;

const uncurry0Args = fn => thisArg => fn.$call(thisArg);
const uncurry1Args = fn => (thisArg, a) => fn.$call(thisArg, a);
const uncurry2Args = fn => (thisArg, a, b) => fn.$call(thisArg, a, b);
const uncurry3Args = fn => (thisArg, a, b, c) => fn.$call(thisArg, a, b, c);
const uncurry4Args = fn => (thisArg, a, b, c, d) => fn.$call(thisArg, a, b, c, d);

// `applyBind` is equivalent to `func => Function.prototype.apply.bind(func)`.
const applyBind = (fn, maybeThisArg) =>
  $argumentCount() === 1 ? (thisArg, args) => fn.$apply(thisArg, args) : args => fn.$apply(maybeThisArg, args);
primordials.applyBind = applyBind;

// Create copies of configurable value properties of the global object
primordials.globalThis = globalThis;

// Create copies of URI handling functions
primordials.decodeURI = decodeURI;
primordials.decodeURIComponent = decodeURIComponent;
primordials.encodeURI = encodeURI;
primordials.encodeURIComponent = encodeURIComponent;

// Create copies of legacy functions
primordials.escape = escape;
// Cannot access `eval` in compiled built-in modules because it's an evaluation sink.
// primordials.eval = eval;
primordials.unescape = unescape;

// Create copies of the namespace objects
primordials.AtomicsLoad = Atomics.load;
primordials.AtomicsStore = Atomics.store;
primordials.AtomicsAdd = Atomics.add;
primordials.AtomicsSub = Atomics.sub;
primordials.AtomicsAnd = Atomics.and;
primordials.AtomicsOr = Atomics.or;
primordials.AtomicsXor = Atomics.xor;
primordials.AtomicsExchange = Atomics.exchange;
primordials.AtomicsCompareExchange = Atomics.compareExchange;
primordials.AtomicsIsLockFree = Atomics.isLockFree;
primordials.AtomicsWait = Atomics.wait;
primordials.AtomicsWaitAsync = Atomics.waitAsync;
primordials.AtomicsNotify = Atomics.notify;

primordials.JSONParse = $jsonParse;
primordials.JSONStringify = $jsonStringify;

primordials.MathAbs = Math.abs;
primordials.MathAcos = Math.acos;
primordials.MathAcosh = Math.acosh;
primordials.MathAsin = Math.asin;
primordials.MathAsinh = Math.asinh;
primordials.MathAtan = Math.atan;
primordials.MathAtanh = Math.atanh;
primordials.MathAtan2 = Math.atan2;
primordials.MathCeil = Math.ceil;
primordials.MathCbrt = Math.cbrt;
primordials.MathExpm1 = Math.expm1;
primordials.MathClz32 = Math.clz32;
primordials.MathCos = Math.cos;
primordials.MathCosh = Math.cosh;
primordials.MathExp = Math.exp;
primordials.MathFloor = Math.floor;
primordials.MathFround = Math.fround;
primordials.MathHypot = Math.hypot;
primordials.MathImul = Math.imul;
primordials.MathLog = Math.log;
primordials.MathLog1p = Math.log1p;
primordials.MathLog2 = Math.log2;
primordials.MathLog10 = Math.log10;
primordials.MathMax = Math.max;
primordials.MathMin = $min;
primordials.MathPow = Math.pow;
primordials.MathRandom = Math.random;
primordials.MathRound = Math.round;
primordials.MathSign = Math.sign;
primordials.MathSin = Math.sin;
primordials.MathSinh = Math.sinh;
primordials.MathSqrt = Math.sqrt;
primordials.MathTan = Math.tan;
primordials.MathTanh = Math.tanh;
primordials.MathTrunc = Math.trunc;
primordials.MathE = Math.E;
primordials.MathLN10 = Math.LN10;
primordials.MathLN2 = Math.LN2;
primordials.MathLOG10E = Math.LOG10E;
primordials.MathLOG2E = Math.LOG2E;
primordials.MathPI = Math.PI;
primordials.MathSQRT1_2 = Math.SQRT1_2;
primordials.MathSQRT2 = Math.SQRT2;

primordials.ReflectApply = Reflect["apply"];
primordials.ReflectConstruct = Reflect.construct;
primordials.ReflectDefineProperty = Reflect.defineProperty;
primordials.ReflectDeleteProperty = Reflect.deleteProperty;
primordials.ReflectGet = Reflect.get;
primordials.ReflectGetOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
primordials.ReflectGetPrototypeOf = Reflect.getPrototypeOf;
primordials.ReflectHas = Reflect.has;
primordials.ReflectIsExtensible = Reflect.isExtensible;
primordials.ReflectOwnKeys = Reflect.ownKeys;
primordials.ReflectPreventExtensions = Reflect.preventExtensions;
primordials.ReflectSet = Reflect.set;
primordials.ReflectSetPrototypeOf = Reflect.setPrototypeOf;

// Create copies of intrinsic objects

// Skipped the following AggregateError properties:
// - length
// - name
primordials.AggregateError = $AggregateError;

// Skipped the following AggregateError.prototype properties:
// - message
// - name
const AggregateErrorPrototype = $AggregateError.prototype;
primordials.AggregateErrorPrototype = AggregateErrorPrototype;

// Skipped the following Array properties:
// - length
// - name
// - SymbolSpecies
primordials.Array = $Array;
primordials.ArrayFrom = (a, c, t) => ($argumentCount() === 1 ? $arrayFromFast($Array, a) : $Array.$from(a, c, t));
primordials.ArrayIsArray = $Array.isArray;
primordials.ArrayOf = $Array.of;
primordials.ArrayOfApply = applyBind($Array.of, $Array);

// Skipped the following Array.prototype properties:
// - length
// - SymbolToStringTag
const ArrayPrototype = $Array.prototype;
primordials.ArrayPrototype = ArrayPrototype;
primordials.ArrayPrototypeAt = uncurry1Args(ArrayPrototype.at);
primordials.ArrayPrototypeConcat = uncurryNArgs(ArrayPrototype.concat);
primordials.ArrayPrototypeCopyWithin = uncurry3Args(ArrayPrototype.copyWithin);
primordials.ArrayPrototypeEntries = a => a.$entries();
primordials.ArrayPrototypeEvery = uncurry2Args(ArrayPrototype.every);
primordials.ArrayPrototypeFill = uncurry3Args(ArrayPrototype.fill);
primordials.ArrayPrototypeFilter = uncurry2Args(ArrayPrototype.filter);
primordials.ArrayPrototypeFind = uncurry2Args(ArrayPrototype.find);
primordials.ArrayPrototypeFindIndex = uncurry2Args(ArrayPrototype.findIndex);
primordials.ArrayPrototypeFindLast = uncurry2Args(ArrayPrototype.findLast);
primordials.ArrayPrototypeFindLastIndex = uncurry2Args(ArrayPrototype.findLastIndex);
primordials.ArrayPrototypeFlat = uncurry1Args(ArrayPrototype.flat);
primordials.ArrayPrototypeFlatMap = uncurry2Args(ArrayPrototype.flatMap);
primordials.ArrayPrototypeForEach = uncurry2Args(ArrayPrototype.forEach);
primordials.ArrayPrototypeIncludes = (a, v, i) => a.$includes(v, i);
primordials.ArrayPrototypeIndexOf = (a, v, i) => a.$indexOf(v, i);
primordials.ArrayPrototypeJoin = uncurry1Args(ArrayPrototype.join);
primordials.ArrayPrototypeKeys = uncurry0Args(ArrayPrototype.keys);
primordials.ArrayPrototypeLastIndexOf = uncurry2Args(ArrayPrototype.lastIndexOf);
primordials.ArrayPrototypeMap = (a, c, t) => a.$map(c, t);
primordials.ArrayPrototypePop = a => a.$pop();
primordials.ArrayPrototypePush = uncurryNArgs(ArrayPrototype.push);
primordials.ArrayPrototypePushApply = applyBind(ArrayPrototype.push);
primordials.ArrayPrototypeReduce = uncurry2Args(ArrayPrototype.reduce);
primordials.ArrayPrototypeReduceRight = uncurry2Args(ArrayPrototype.reduceRight);
primordials.ArrayPrototypeReverse = uncurry0Args(ArrayPrototype.reverse);
primordials.ArrayPrototypeShift = uncurry0Args(ArrayPrototype.shift);
primordials.ArrayPrototypeSlice = uncurry2Args(ArrayPrototype.slice);
primordials.ArrayPrototypeSome = uncurry2Args(ArrayPrototype.some);
primordials.ArrayPrototypeSort = (a, c) => $arraySort.$call(a, c);
primordials.ArrayPrototypeSplice = uncurry2Args(ArrayPrototype.splice);
primordials.ArrayPrototypeSymbolIterator = uncurry0Args(ArrayPrototype[SymbolIterator]);
primordials.ArrayPrototypeSymbolUnscopables = ArrayPrototype[SymbolUnscopables];
primordials.ArrayPrototypeToLocaleString = uncurry2Args(ArrayPrototype.toLocaleString);
primordials.ArrayPrototypeToReversed = uncurry0Args(ArrayPrototype.toReversed);
primordials.ArrayPrototypeToSorted = uncurry1Args(ArrayPrototype.toSorted);
primordials.ArrayPrototypeToString = uncurry0Args(ArrayPrototype.toString);
primordials.ArrayPrototypeUnshift = uncurryNArgs(ArrayPrototype.unshift);
primordials.ArrayPrototypeUnshiftApply = applyBind(ArrayPrototype.unshift);
primordials.ArrayPrototypeValues = uncurry0Args(ArrayPrototype.values);

// Skipped the following ArrayBuffer properties:
// - length
// - name
// - SymbolSpecies
primordials.ArrayBuffer = $ArrayBuffer;
primordials.ArrayBufferIsView = $ArrayBuffer.$isView;

// Skipped the following ArrayBuffer.prototype properties:
// - SymbolToStringTag
const ArrayBufferPrototype = $ArrayBuffer.prototype;
primordials.ArrayBufferPrototype = ArrayBufferPrototype;
primordials.ArrayBufferPrototypeGetByteLength = uncurry0Args(ArrayBufferPrototype.__lookupGetter__("byteLength"));
primordials.ArrayBufferPrototypeSlice = uncurry2Args(ArrayBufferPrototype.slice);

// Skipped the following BigInt properties:
// - length
// - name
primordials.BigInt = BigInt;
primordials.BigIntAsIntN = BigInt.asIntN;
primordials.BigIntAsUintN = BigInt.asUintN;

// Skipped the following BigInt.prototype properties:
// - SymbolToStringTag
const BigIntPrototype = BigInt.prototype;
primordials.BigIntPrototype = BigIntPrototype;
primordials.BigIntPrototypeToLocaleString = uncurry2Args(BigIntPrototype.toLocaleString);
primordials.BigIntPrototypeToString = uncurry0Args(BigIntPrototype.toString);
primordials.BigIntPrototypeValueOf = uncurry0Args(BigIntPrototype.valueOf);

// Skipped the following BigInt64Array properties:
// - length
// - name
// - SymbolSpecies
primordials.BigInt64Array = $BigInt64Array;
primordials.BigInt64ArrayBYTES_PER_ELEMENT = $BigInt64Array.BYTES_PER_ELEMENT;

const BigInt64ArrayPrototype = $BigInt64Array.prototype;
primordials.BigInt64ArrayPrototype = BigInt64ArrayPrototype;
primordials.BigInt64ArrayPrototypeBYTES_PER_ELEMENT = BigInt64ArrayPrototype.BYTES_PER_ELEMENT;

// Skipped the following BigInt64Array properties:
// - length
// - name
// - SymbolSpecies
primordials.BigUint64Array = $BigUint64Array;
primordials.BigUint64ArrayBYTES_PER_ELEMENT = $BigUint64Array.BYTES_PER_ELEMENT;

const BigUint64ArrayPrototype = $BigUint64Array.prototype;
primordials.BigUint64ArrayPrototype = BigUint64ArrayPrototype;
primordials.BigUint64ArrayPrototypeBYTES_PER_ELEMENT = BigUint64ArrayPrototype.BYTES_PER_ELEMENT;

// Skipped the following Boolean properties:
// - length
// - name
primordials.Boolean = Boolean;

const BooleanPrototype = Boolean.prototype;
primordials.BooleanPrototype = BooleanPrototype;
primordials.BooleanPrototypeToString = uncurry0Args(BooleanPrototype.toString);
primordials.BooleanPrototypeValueOf = uncurry0Args(BooleanPrototype.valueOf);

// Skipped the following DataView properties:
// - length
// - name
primordials.DataView = DataView;

// Skipped the following DataView.prototype properties:
// - SymbolToStringTag
const DataViewPrototype = DataView.prototype;
primordials.DataViewPrototype = DataViewPrototype;
primordials.DataViewPrototypeGetBuffer = uncurry0Args(DataViewPrototype.__lookupGetter__("buffer"));
primordials.DataViewPrototypeGetByteLength = uncurry0Args(DataViewPrototype.__lookupGetter__("byteLength"));
primordials.DataViewPrototypeGetByteOffset = uncurry0Args(DataViewPrototype.__lookupGetter__("byteOffset"));
primordials.DataViewPrototypeGetBigInt64 = uncurry2Args(DataViewPrototype.getBigInt64);
primordials.DataViewPrototypeGetBigUint64 = uncurry2Args(DataViewPrototype.getBigUint64);
primordials.DataViewPrototypeGetFloat32 = uncurry2Args(DataViewPrototype.getFloat32);
primordials.DataViewPrototypeGetFloat64 = uncurry2Args(DataViewPrototype.getFloat64);
primordials.DataViewPrototypeGetInt16 = uncurry2Args(DataViewPrototype.getInt16);
primordials.DataViewPrototypeGetInt32 = uncurry2Args(DataViewPrototype.getInt32);
primordials.DataViewPrototypeGetInt8 = uncurry1Args(DataViewPrototype.getInt8);
primordials.DataViewPrototypeGetUint16 = uncurry2Args(DataViewPrototype.getUint16);
primordials.DataViewPrototypeGetUint32 = uncurry2Args(DataViewPrototype.getUint32);
primordials.DataViewPrototypeGetUint8 = uncurry1Args(DataViewPrototype.getUint8);
primordials.DataViewPrototypeSetBigInt64 = uncurry3Args(DataViewPrototype.setBigInt64);
primordials.DataViewPrototypeSetBigUint64 = uncurry3Args(DataViewPrototype.setBigUint64);
primordials.DataViewPrototypeSetFloat32 = uncurry3Args(DataViewPrototype.setFloat32);
primordials.DataViewPrototypeSetFloat64 = uncurry3Args(DataViewPrototype.setFloat64);
primordials.DataViewPrototypeSetInt16 = uncurry3Args(DataViewPrototype.setInt16);
primordials.DataViewPrototypeSetInt32 = uncurry3Args(DataViewPrototype.setInt32);
primordials.DataViewPrototypeSetInt8 = uncurry2Args(DataViewPrototype.setInt8);
primordials.DataViewPrototypeSetUint16 = uncurry3Args(DataViewPrototype.setUint16);
primordials.DataViewPrototypeSetUint32 = uncurry3Args(DataViewPrototype.setUint32);
primordials.DataViewPrototypeSetUint8 = uncurry2Args(DataViewPrototype.setUint8);

// Skipped the following Date properties:
// - length
// - name
primordials.Date = Date;
primordials.DateNow = Date.now;
primordials.DateParse = Date.parse;
primordials.DateUTC = Date.UTC;

// Skipped the following Date.prototype properties:
// - getYear (deprecated)
// - setYear (deprecated)
// - toGMTString (alias of toUTCString)
const DatePrototype = Date.prototype;
primordials.DatePrototype = DatePrototype;
primordials.DatePrototypeGetDate = uncurry0Args(DatePrototype.getDate);
primordials.DatePrototypeGetDay = uncurry0Args(DatePrototype.getDay);
primordials.DatePrototypeGetFullYear = uncurry0Args(DatePrototype.getFullYear);
primordials.DatePrototypeGetHours = uncurry0Args(DatePrototype.getHours);
primordials.DatePrototypeGetMilliseconds = uncurry0Args(DatePrototype.getMilliseconds);
primordials.DatePrototypeGetMinutes = uncurry0Args(DatePrototype.getMinutes);
primordials.DatePrototypeGetMonth = uncurry0Args(DatePrototype.getMonth);
primordials.DatePrototypeGetSeconds = uncurry0Args(DatePrototype.getSeconds);
primordials.DatePrototypeGetTime = uncurry0Args(DatePrototype.getTime);
primordials.DatePrototypeGetTimezoneOffset = uncurry0Args(DatePrototype.getTimezoneOffset);
primordials.DatePrototypeGetUTCDate = uncurry0Args(DatePrototype.getUTCDate);
primordials.DatePrototypeGetUTCDay = uncurry0Args(DatePrototype.getUTCDay);
primordials.DatePrototypeGetUTCFullYear = uncurry0Args(DatePrototype.getUTCFullYear);
primordials.DatePrototypeGetUTCHours = uncurry0Args(DatePrototype.getUTCHours);
primordials.DatePrototypeGetUTCMilliseconds = uncurry0Args(DatePrototype.getUTCMilliseconds);
primordials.DatePrototypeGetUTCMinutes = uncurry0Args(DatePrototype.getUTCMinutes);
primordials.DatePrototypeGetUTCMonth = uncurry0Args(DatePrototype.getUTCMonth);
primordials.DatePrototypeGetUTCSeconds = uncurry0Args(DatePrototype.getUTCSeconds);
primordials.DatePrototypeSetDate = uncurry1Args(DatePrototype.setDate);
primordials.DatePrototypeSetFullYear = uncurry3Args(DatePrototype.setFullYear);
primordials.DatePrototypeSetHours = uncurry4Args(DatePrototype.setHours);
primordials.DatePrototypeSetMilliseconds = uncurry1Args(DatePrototype.setMilliseconds);
primordials.DatePrototypeSetMinutes = uncurry3Args(DatePrototype.setMinutes);
primordials.DatePrototypeSetMonth = uncurry2Args(DatePrototype.setMonth);
primordials.DatePrototypeSetSeconds = uncurry2Args(DatePrototype.setSeconds);
primordials.DatePrototypeSetTime = uncurry1Args(DatePrototype.setTime);
primordials.DatePrototypeSetUTCDate = uncurry1Args(DatePrototype.setUTCDate);
primordials.DatePrototypeSetUTCFullYear = uncurry3Args(DatePrototype.setUTCFullYear);
primordials.DatePrototypeSetUTCHours = uncurry4Args(DatePrototype.setUTCHours);
primordials.DatePrototypeSetUTCMilliseconds = uncurry1Args(DatePrototype.setUTCMilliseconds);
primordials.DatePrototypeSetUTCMinutes = uncurry3Args(DatePrototype.setUTCMinutes);
primordials.DatePrototypeSetUTCMonth = uncurry2Args(DatePrototype.setUTCMonth);
primordials.DatePrototypeSetUTCSeconds = uncurry2Args(DatePrototype.setUTCSeconds);
primordials.DatePrototypeSymbolToPrimitive = uncurry1Args(DatePrototype[SymbolToPrimitive]);
primordials.DatePrototypeToDateString = uncurry0Args(DatePrototype.toDateString);
primordials.DatePrototypeToISOString = uncurry0Args(DatePrototype.toISOString);
primordials.DatePrototypeToJSON = uncurry0Args(DatePrototype.toJSON);
primordials.DatePrototypeToLocaleDateString = uncurry2Args(DatePrototype.toLocaleDateString);
primordials.DatePrototypeToLocaleString = uncurry2Args(DatePrototype.toLocaleString);
primordials.DatePrototypeToLocaleTimeString = uncurry2Args(DatePrototype.toLocaleTimeString);
primordials.DatePrototypeToString = uncurry0Args(DatePrototype.toString);
primordials.DatePrototypeToTimeString = uncurry0Args(DatePrototype.toTimeString);
primordials.DatePrototypeToUTCString = uncurry0Args(DatePrototype.toUTCString);
primordials.DatePrototypeValueOf = uncurry0Args(DatePrototype.valueOf);

// Skipped the following Error properties:
// - length
// - name
primordials.Error = Error;
primordials.ErrorCaptureStackTrace = Error.captureStackTrace;
primordials.ErrorStackTraceLimit = Error.stackTraceLimit;

// Skipped the following Error.prototype properties:
// - message
// - name
const ErrorPrototype = Error.prototype;
primordials.ErrorPrototype = ErrorPrototype;
primordials.ErrorPrototypeToString = uncurry0Args(ErrorPrototype.toString);

// Skipped the following EvalError properties:
// - length
// - name
primordials.EvalError = EvalError;

// Skipped the following EvalError.prototype properties:
// - message
// - name
const EvalErrorPrototype = EvalError.prototype;
primordials.EvalErrorPrototype = EvalErrorPrototype;

primordials.FinalizationRegistry = FinalizationRegistry;

// Skipped the following FinalizationRegistry.prototype properties:
// - SymbolToStringTag
primordials.FinalizationRegistryPrototype = FinalizationRegistryPrototype;
primordials.FinalizationRegistryPrototypeRegister = uncurry3Args(FinalizationRegistryPrototypeRegisterRaw);
primordials.FinalizationRegistryPrototypeUnregister = uncurry1Args(FinalizationRegistryPrototypeUnregisterRaw);

// Skipped the following Float32Array properties:
// - length
// - name
// - SymbolSpecies
primordials.Float32Array = $Float32Array;
primordials.Float32ArrayBYTES_PER_ELEMENT = $Float32Array.BYTES_PER_ELEMENT;

const Float32ArrayPrototype = $Float32Array.prototype;
primordials.Float32ArrayPrototype = Float32ArrayPrototype;
primordials.Float32ArrayPrototypeBYTES_PER_ELEMENT = Float32ArrayPrototype.BYTES_PER_ELEMENT;

// Skipped the following Float64Array properties:
// - length
// - name
// - SymbolSpecies
primordials.Float64Array = $Float64Array;
primordials.Float64ArrayBYTES_PER_ELEMENT = $Float64Array.BYTES_PER_ELEMENT;

const Float64ArrayPrototype = $Float64Array.prototype;
primordials.Float64ArrayPrototype = Float64ArrayPrototype;
primordials.Float64ArrayPrototypeBYTES_PER_ELEMENT = Float64ArrayPrototype.BYTES_PER_ELEMENT;

// Cannot access `Function` in compiled built-in modules because it's an evaluation sink.
// primordials.Function = Function;

// Skipped the following Function.prototype properties:
// - arguments
// - caller
// - length
// - name
const FunctionPrototype = Function.prototype;
primordials.FunctionPrototype = FunctionPrototype;
primordials.FunctionPrototypeApply = (f, t, a) => f.$apply(t, a);
primordials.FunctionPrototypeBind = uncurryNArgs(FunctionPrototype.bind);
primordials.FunctionPrototypeCall = (f, t, ...a) => f.$apply(t, a);
primordials.FunctionPrototypeSymbolHasInstance = uncurry1Args(FunctionPrototype[SymbolHasInstance]);
primordials.FunctionPrototypeToString = uncurry0Args(FunctionPrototype.toString);

// Skipped the following Int16Array properties:
// - length
// - name
// - SymbolSpecies
primordials.Int16Array = $Int16Array;
primordials.Int16ArrayBYTES_PER_ELEMENT = $Int16Array.BYTES_PER_ELEMENT;

const Int16ArrayPrototype = $Int16Array.prototype;
primordials.Int16ArrayPrototype = Int16ArrayPrototype;
primordials.Int16ArrayPrototypeBYTES_PER_ELEMENT = Int16ArrayPrototype.BYTES_PER_ELEMENT;

// Skipped the following Int32Array properties:
// - length
// - name
// - SymbolSpecies
primordials.Int32Array = $Int32Array;
primordials.Int32ArrayBYTES_PER_ELEMENT = $Int32Array.BYTES_PER_ELEMENT;

const Int32ArrayPrototype = $Int32Array.prototype;
primordials.Int32ArrayPrototype = Int32ArrayPrototype;
primordials.Int32ArrayPrototypeBYTES_PER_ELEMENT = Int32ArrayPrototype.BYTES_PER_ELEMENT;

// Skipped the following Int8Array properties:
// - length
// - name
// - SymbolSpecies
primordials.Int8Array = $Int8Array;
primordials.Int8ArrayBYTES_PER_ELEMENT = $Int8Array.BYTES_PER_ELEMENT;

const Int8ArrayPrototype = $Int8Array.prototype;
primordials.Int8ArrayPrototype = Int8ArrayPrototype;
primordials.Int8ArrayPrototypeBYTES_PER_ELEMENT = Int8ArrayPrototype.BYTES_PER_ELEMENT;

// Skipped the following Map properties:
// - length
// - name
// - SymbolSpecies
primordials.Map = $Map;
primordials.MapGroupBy = $Map.groupBy;

primordials.MapPrototype = MapPrototype;
primordials.MapPrototypeClear = m => m.$clear();
primordials.MapPrototypeDelete = (m, k) => m.$delete(k);
primordials.MapPrototypeEntries = m => m.$entries();
primordials.MapPrototypeForEach = (m, c, t) => m.$forEach(c, t);
primordials.MapPrototypeGet = (m, k) => m.$get(k);
primordials.MapPrototypeHas = (m, k) => m.$has(k);
primordials.MapPrototypeKeys = m => m.$keys();
primordials.MapPrototypeSet = (m, k, v) => m.$set(k, v);
primordials.MapPrototypeGetSize = m => m.$size;
primordials.MapPrototypeSymbolIterator = uncurry0Args(MapPrototypeSymbolIteratorRaw);
primordials.MapPrototypeSymbolToStringTag = MapPrototypeSymbolToStringTag;
primordials.MapPrototypeValues = m => m.$values();

// Skipped the following Number properties:
// - length
// - name
primordials.Number = Number;
primordials.NumberEPSILON = Number.EPSILON;
primordials.NumberIsFinite = Number.isFinite;
primordials.NumberIsInteger = Number.isInteger;
primordials.NumberIsNaN = Number.isNaN;
primordials.NumberIsSafeInteger = Number.isSafeInteger;
primordials.NumberMAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
primordials.NumberMAX_VALUE = Number.MAX_VALUE;
primordials.NumberMIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;
primordials.NumberMIN_VALUE = Number.MIN_VALUE;
primordials.NumberNaN = Number.NaN;
primordials.NumberNEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
primordials.NumberParseFloat = Number.parseFloat;
primordials.NumberParseInt = Number.parseInt;
primordials.NumberPOSITIVE_INFINITY = Number.POSITIVE_INFINITY;

const NumberPrototype = Number.prototype;
primordials.NumberPrototype = NumberPrototype;
primordials.NumberPrototypeToExponential = uncurry1Args(NumberPrototype.toExponential);
primordials.NumberPrototypeToFixed = uncurry1Args(NumberPrototype.toFixed);
primordials.NumberPrototypeToLocaleString = uncurry2Args(NumberPrototype.toLocaleString);
primordials.NumberPrototypeToPrecision = uncurry1Args(NumberPrototype.toPrecision);
primordials.NumberPrototypeToString = uncurry1Args(NumberPrototype.toString);
primordials.NumberPrototypeValueOf = uncurry0Args(NumberPrototype.valueOf);

// Skipped the following Object properties:
// - length
// - name
primordials.Object = $Object;
primordials.ObjectAssign = $Object.assign;
primordials.ObjectCreate = $Object.$create;
primordials.ObjectDefineProperties = $Object.defineProperties;
primordials.ObjectDefineProperty = $Object.$defineProperty;
primordials.ObjectEntries = $Object.entries;
primordials.ObjectFreeze = $Object.freeze;
primordials.ObjectFromEntries = $Object.fromEntries;
primordials.ObjectGetOwnPropertyDescriptor = $Object.$getOwnPropertyDescriptor;
primordials.ObjectGetOwnPropertyDescriptors = $Object.getOwnPropertyDescriptors;
primordials.ObjectGetOwnPropertyNames = $Object.$getOwnPropertyNames;
primordials.ObjectGetOwnPropertySymbols = $Object.getOwnPropertySymbols;
primordials.ObjectGetPrototypeOf = $Object.$getPrototypeOf;
primordials.ObjectGroupBy = $Object.groupBy;
primordials.ObjectHasOwn = $Object.$hasOwn;
primordials.ObjectIs = $Object.is;
primordials.ObjectIsExtensible = $Object.isExtensible;
primordials.ObjectIsFrozen = $Object.isFrozen;
primordials.ObjectIsSealed = $Object.isSealed;
primordials.ObjectKeys = $Object.$keys;
primordials.ObjectPreventExtensions = $Object.preventExtensions;
primordials.ObjectSeal = $Object.seal;
primordials.ObjectSetPrototypeOf = $Object.setPrototypeOf;
primordials.ObjectValues = $Object.$values;

// Skipped the following Object.prototype properties:
// - __defineGetter__
// - __defineSetter__
// - __lookupGetter__
// - __lookupSetter__
// - __proto__
// - constructor
const ObjectPrototype = $Object.prototype;
primordials.ObjectPrototype = ObjectPrototype;
primordials.ObjectPrototypeHasOwnProperty = $Object.$hasOwn;
primordials.ObjectPrototypeIsPrototypeOf = uncurry1Args(ObjectPrototype.isPrototypeOf);
primordials.ObjectPrototypePropertyIsEnumerable = uncurry1Args(ObjectPrototype.propertyIsEnumerable);
primordials.ObjectPrototypeToLocaleString = uncurry0Args(ObjectPrototype.toLocaleString);
primordials.ObjectPrototypeToString = uncurry0Args(ObjectPrototype.toString);
primordials.ObjectPrototypeValueOf = uncurry0Args(ObjectPrototype.valueOf);

// Skipped the following Proxy properties:
// - length
// - name
primordials.ProxyRevocable = Proxy.revocable;

// Skipped the following RangeError properties:
// - length
// - name
primordials.RangeError = RangeError;

// Skipped the following RangeError.prototype properties:
// - message
// - name
const RangeErrorPrototype = RangeError.prototype;
primordials.RangeErrorPrototype = RangeErrorPrototype;

primordials.ReferenceError = ReferenceError;

// Skipped the following ReferenceError.prototype properties:
// - message
// - name
const ReferenceErrorPrototype = ReferenceError.prototype;
primordials.ReferenceErrorPrototype = ReferenceErrorPrototype;

// Skipped the following RegExp properties:
// - length
// - name
// - SymbolSpecies
primordials.RegExp = $RegExp;

// Skipped the following RegExp.prototype properties:
// - $_
// - $&
// - $`
// - $+
// - $1
// - $2
// - $3
// - $4
// - $5
// - $6
// - $7
// - $8
// - $9
// - compile (deprecated)
// - input
// - lastMatch
// - lastParen
// - leftContext
// - rightContext
primordials.RegExpPrototype = RegExpPrototype;
primordials.RegExpPrototypeGetDotAll = uncurry0Args(RegExpPrototype.__lookupGetter__("dotAll"));
primordials.RegExpPrototypeExec = (r, s) => RegExpPrototypeExecRaw.$call(r, s);
primordials.RegExpPrototypeGetFlags = uncurry0Args(RegExpPrototype.__lookupGetter__("flags"));
primordials.RegExpPrototypeGetGlobal = uncurry0Args(RegExpPrototype.__lookupGetter__("global"));
primordials.RegExpPrototypeGetHasIndices = uncurry0Args(RegExpPrototype.__lookupGetter__("hasIndices"));
primordials.RegExpPrototypeGetIgnoreCase = uncurry0Args(RegExpPrototype.__lookupGetter__("ignoreCase"));
primordials.RegExpPrototypeGetMultiline = uncurry0Args(RegExpPrototype.__lookupGetter__("multiline"));
primordials.RegExpPrototypeGetSource = uncurry0Args(RegExpPrototype.__lookupGetter__("source"));
primordials.RegExpPrototypeGetSticky = uncurry0Args(RegExpPrototype.__lookupGetter__("sticky"));
primordials.RegExpPrototypeSymbolMatch = uncurry1Args(RegExpPrototypeSymbolMatchRaw);
primordials.RegExpPrototypeSymbolMatchAll = uncurry1Args(RegExpPrototypeSymbolMatchAllRaw);
primordials.RegExpPrototypeSymbolReplace = uncurry2Args(RegExpPrototypeSymbolReplaceRaw);
primordials.RegExpPrototypeSymbolSearch = uncurry1Args(RegExpPrototypeSymbolSearchRaw);
primordials.RegExpPrototypeSymbolSplit = uncurry2Args(RegExpPrototypeSymbolSplitRaw);
primordials.RegExpPrototypeTest = uncurry1Args(RegExpPrototype.test);
primordials.RegExpPrototypeToString = uncurry0Args(RegExpPrototype.toString);
primordials.RegExpPrototypeGetUnicode = uncurry0Args(RegExpPrototype.__lookupGetter__("unicode"));

// Skipped the following Set properties:
// - length
// - name
// - SymbolSpecies
primordials.Set = $Set;

primordials.SetPrototype = SetPrototype;
primordials.SetPrototypeAdd = (s, v) => s.$add(v);
primordials.SetPrototypeClear = s => s.$clear();
primordials.SetPrototypeDelete = (s, v) => s.$delete(v);
primordials.SetPrototypeDifference = uncurry1Args(SetPrototypeDifferenceRaw);
primordials.SetPrototypeEntries = s => s.$entries();
primordials.SetPrototypeForEach = (s, c, t) => s.$forEach(c, t);
primordials.SetPrototypeHas = (s, v) => s.$has(v);
primordials.SetPrototypeIntersection = uncurry1Args(SetPrototypeIntersectionRaw);
primordials.SetPrototypeIsDisjointFrom = uncurry1Args(SetPrototypeIsDisjointFromRaw);
primordials.SetPrototypeIsSubsetOf = uncurry1Args(SetPrototypeIsSubsetOfRaw);
primordials.SetPrototypeIsSupersetOf = uncurry1Args(SetPrototypeIsSupersetOfRaw);
primordials.SetPrototypeKeys = s => s.$keys();
primordials.SetPrototypeGetSize = s => s.$size;
primordials.SetPrototypeSymmetricDifference = uncurry1Args(SetPrototypeSymmetricDifferenceRaw);
primordials.SetPrototypeSymbolIterator = uncurry0Args(SetPrototypeSymbolIteratorRaw);
primordials.SetPrototypeSymbolToStringTag = SetPrototypeSymbolToStringTag;
primordials.SetPrototypeUnion = uncurry1Args(SetPrototypeUnionRaw);
primordials.SetPrototypeValues = s => s.$values();

// Skipped the following String properties:
// - length
// - name
primordials.String = $String;
primordials.StringFromCharCode = $String.fromCharCode;
primordials.StringFromCharCodeApply = applyBind($String.fromCharCode, $String);
primordials.StringFromCodePoint = $String.fromCodePoint;
primordials.StringFromCodePointApply = applyBind($String.fromCodePoint, $String);
primordials.StringRaw = $String.raw;

// Skipped the following String.prototype properties:
// - anchor
// - big
// - blink
// - bold
// - fixed
// - fontcolor
// - fontsize
// - italics
// - length
// - link
// - small
// - strike
// - sub
// - substr
// - sup
// - trimLeft (alias of trimStart)
// - trimRight (alias of trimEnd)
const StringPrototype = $String.prototype;
primordials.StringPrototype = StringPrototype;
primordials.StringPrototypeAt = uncurry1Args(StringPrototype.at);
primordials.StringPrototypeCharAt = uncurry1Args(StringPrototype.charAt);
primordials.StringPrototypeCharCodeAt = (s, i) => s.$charCodeAt(i);
primordials.StringPrototypeCodePointAt = uncurry1Args(StringPrototype.codePointAt);
primordials.StringPrototypeConcat = uncurryNArgs(StringPrototype.concat);
primordials.StringPrototypeConcatApply = applyBind(StringPrototype.concat);
primordials.StringPrototypeEndsWith = uncurry2Args(StringPrototype.endsWith);
primordials.StringPrototypeIncludes = (s, f, p) => $stringIncludesInternal.$call(s, f, p);
primordials.StringPrototypeIndexOf = uncurry2Args(StringPrototype.indexOf);
primordials.StringPrototypeLastIndexOf = uncurry2Args(StringPrototype.lastIndexOf);
primordials.StringPrototypeLocaleCompare = uncurry3Args(StringPrototype.localeCompare);
primordials.StringPrototypeMatch = uncurry1Args(StringPrototype.match);
primordials.StringPrototypeMatchAll = uncurry1Args(StringPrototype.matchAll);
primordials.StringPrototypeNormalize = uncurry1Args(StringPrototype.normalize);
primordials.StringPrototypePadEnd = uncurry2Args(StringPrototype.padEnd);
primordials.StringPrototypePadStart = uncurry2Args(StringPrototype.padStart);
primordials.StringPrototypeRepeat = uncurry1Args(StringPrototype.repeat);
primordials.StringPrototypeReplace = uncurry2Args(StringPrototype.replace);
primordials.StringPrototypeReplaceAll = uncurry2Args(StringPrototype.replaceAll);
primordials.StringPrototypeSearch = (s, r) => RegExpPrototypeSymbolSearchRaw.$call(r, s);
primordials.StringPrototypeSlice = uncurry2Args(StringPrototype.slice);
primordials.StringPrototypeSplit = uncurry2Args(StringPrototype.split);
primordials.StringPrototypeStartsWith = uncurry2Args(StringPrototype.startsWith);
primordials.StringPrototypeSubstring = (s, i, e) => $stringSubstring.$call(s, i, e);
primordials.StringPrototypeSymbolIterator = uncurry0Args(StringPrototype[SymbolIterator]);
primordials.StringPrototypeToLocaleLowerCase = uncurry1Args(StringPrototype.toLocaleLowerCase);
primordials.StringPrototypeToLocaleUpperCase = uncurry1Args(StringPrototype.toLocaleUpperCase);
primordials.StringPrototypeToLowerCase = uncurry0Args(StringPrototype.toLowerCase);
primordials.StringPrototypeToString = uncurry0Args(StringPrototype.toString);
primordials.StringPrototypeToUpperCase = uncurry0Args(StringPrototype.toUpperCase);
primordials.StringPrototypeTrim = uncurry0Args(StringPrototype.trim);
primordials.StringPrototypeTrimEnd = uncurry0Args(StringPrototype.trimEnd);
primordials.StringPrototypeTrimStart = uncurry0Args(StringPrototype.trimStart);
primordials.StringPrototypeValueOf = uncurry0Args(StringPrototype.valueOf);

// Skipped the following Symbol properties:
// - length
// - name
primordials.Symbol = Symbol;
primordials.SymbolAsyncDispose = Symbol.asyncDispose;
primordials.SymbolAsyncIterator = SymbolAsyncIterator;
primordials.SymbolDispose = Symbol.dispose;
primordials.SymbolFor = SymbolFor;
primordials.SymbolHasInstance = SymbolHasInstance;
primordials.SymbolIsConcatSpreadable = SymbolIsConcatSpreadable;
primordials.SymbolIterator = SymbolIterator;
primordials.SymbolKeyFor = Symbol.keyFor;
primordials.SymbolMatch = SymbolMatch;
primordials.SymbolMatchAll = SymbolMatchAll;
primordials.SymbolReplace = SymbolReplace;
primordials.SymbolSearch = SymbolSearch;
primordials.SymbolSpecies = SymbolSpecies;
primordials.SymbolSplit = SymbolSplit;
primordials.SymbolToPrimitive = SymbolToPrimitive;
primordials.SymbolToStringTag = SymbolToStringTag;
primordials.SymbolUnscopables = SymbolUnscopables;

// Skipped the following Symbol.prototype properties:
// - SymbolToStringTag
const SymbolPrototype = Symbol.prototype;
primordials.SymbolPrototype = SymbolPrototype;
primordials.SymbolPrototypeGetDescription = uncurry0Args(SymbolPrototype.__lookupGetter__("description"));
primordials.SymbolPrototypeSymbolToPrimitive = uncurry1Args(SymbolPrototype[SymbolToPrimitive]);
primordials.SymbolPrototypeToString = uncurry0Args(SymbolPrototype.toString);
primordials.SymbolPrototypeValueOf = uncurry0Args(SymbolPrototype.valueOf);

// Skipped the following SyntaxError properties:
// - length
// - name
primordials.SyntaxError = SyntaxError;

// Skipped the following SyntaxError.prototype properties:
// - message
// - name
const SyntaxErrorPrototype = SyntaxError.prototype;
primordials.SyntaxErrorPrototype = SyntaxErrorPrototype;

// Skipped the following TypeError properties:
// - length
// - name
primordials.TypeError = TypeError;

// Skipped the following TypeError.prototype properties:
// - message
// - name
const TypeErrorPrototype = TypeError.prototype;
primordials.TypeErrorPrototype = TypeErrorPrototype;

// Skipped the following URIError properties:
// - length
// - name
primordials.URIError = URIError;

// Skipped the following URIError.prototype properties:
// - message
// - name
const URIErrorPrototype = URIError.prototype;
primordials.URIErrorPrototype = URIErrorPrototype;

// Skipped the following Uint16Array properties:
// - length
// - name
// - SymbolSpecies
primordials.Uint16Array = $Uint16Array;
primordials.Uint16ArrayBYTES_PER_ELEMENT = $Uint16Array.BYTES_PER_ELEMENT;

const Uint16ArrayPrototype = $Uint16Array.prototype;
primordials.Uint16ArrayPrototype = Uint16ArrayPrototype;
primordials.Uint16ArrayPrototypeBYTES_PER_ELEMENT = Uint16ArrayPrototype.BYTES_PER_ELEMENT;

// Skipped the following Uint32Array properties:
// - length
// - name
// - SymbolSpecies
primordials.Uint32Array = $Uint32Array;
primordials.Uint32ArrayBYTES_PER_ELEMENT = $Uint32Array.BYTES_PER_ELEMENT;

const Uint32ArrayPrototype = $Uint32Array.prototype;
primordials.Uint32ArrayPrototype = Uint32ArrayPrototype;
primordials.Uint32ArrayPrototypeBYTES_PER_ELEMENT = Uint32ArrayPrototype.BYTES_PER_ELEMENT;

// Skipped the following Uint8Array properties:
// - length
// - name
// - SymbolSpecies
primordials.Uint8Array = $Uint8Array;
primordials.Uint8ArrayBYTES_PER_ELEMENT = $Uint8Array.BYTES_PER_ELEMENT;

const Uint8ArrayPrototype = $Uint8Array.prototype;
primordials.Uint8ArrayPrototype = Uint8ArrayPrototype;
primordials.Uint8ArrayPrototypeBYTES_PER_ELEMENT = Uint8ArrayPrototype.BYTES_PER_ELEMENT;

// Skipped the following Uint8ClampedArray properties:
// - length
// - name
// - SymbolSpecies
primordials.Uint8ClampedArray = $Uint8ClampedArray;
primordials.Uint8ClampedArrayBYTES_PER_ELEMENT = $Uint8ClampedArray.BYTES_PER_ELEMENT;

const Uint8ClampedArrayPrototype = $Uint8ClampedArray.prototype;
primordials.Uint8ClampedArrayPrototype = Uint8ClampedArrayPrototype;
primordials.Uint8ClampedArrayPrototypeBYTES_PER_ELEMENT = Uint8ClampedArrayPrototype.BYTES_PER_ELEMENT;

// Skipped the following WeakMap properties:
// - length
// - name
primordials.WeakMap = WeakMap;

primordials.WeakMapPrototype = WeakMapPrototype;
primordials.WeakMapPrototypeDelete = uncurry1Args(WeakMapPrototypeDeleteRaw);
primordials.WeakMapPrototypeGet = uncurry1Args(WeakMapPrototypeGetRaw);
primordials.WeakMapPrototypeHas = uncurry1Args(WeakMapPrototypeHasRaw);
primordials.WeakMapPrototypeSet = uncurry2Args(WeakMapPrototypeSetRaw);
primordials.WeakMapPrototypeSymbolToStringTag = WeakMapPrototypeSymbolToStringTag;

// Skipped the following WeakRef properties:
// - length
// - name
primordials.WeakRef = WeakRef;

primordials.WeakRefPrototype = WeakRefPrototype;
primordials.WeakRefPrototypeDeref = uncurry0Args(WeakRefPrototypeDerefRaw);
primordials.WeakRefPrototypeSymbolToStringTag = WeakRefPrototypeSymbolToStringTag;

// Skipped the following WeakSet properties:
// - length
// - name
primordials.WeakSet = WeakSet;

primordials.WeakSetPrototype = WeakSetPrototype;
primordials.WeakSetPrototypeAdd = uncurry1Args(WeakSetPrototypeAddRaw);
primordials.WeakSetPrototypeDelete = uncurry1Args(WeakSetPrototypeDeleteRaw);
primordials.WeakSetPrototypeHas = uncurry1Args(WeakSetPrototypeHasRaw);
primordials.WeakSetPrototypeSymbolToStringTag = WeakSetPrototypeSymbolToStringTag;

// Skipped the following Promise properties:
// - length
// - name
// - SymbolSpecies
primordials.Promise = $Promise;

// Create copies of intrinsic objects that require a valid `this` to call
// static methods.
// Refs: https://www.ecma-international.org/ecma-262/#sec-promise.all
primordials.PromiseAll = PromiseAllRaw.bind($Promise);
primordials.PromiseAllSettled = PromiseAllSettledRaw.bind($Promise);
primordials.PromiseAny = PromiseAnyRaw.bind($Promise);
primordials.PromiseRace = PromiseRaceRaw.bind($Promise);
primordials.PromiseReject = v => $Promise.$reject(v);
primordials.PromiseResolve = v => $Promise.$resolve(v);
primordials.withResolvers = () => $newPromiseCapability($Promise);

primordials.PromisePrototype = PromisePrototype;
primordials.PromisePrototypeCatch = uncurry1Args(PromisePrototypeCatchRaw);
primordials.PromisePrototypeFinally = uncurry1Args(PromisePrototypeFinallyRaw);
primordials.PromisePrototypeThen = (p, f, r) => p.$then(f, r);

// Create copies of abstract intrinsic objects that are not directly exposed
// on the global object.
// Refs: https://tc39.es/ecma262/#sec-%typedarray%-intrinsic-object

// Skipped the following TypedArray properties:
// - SymbolSpecies
const TypedArray = $Uint8Array.__proto__;
primordials.TypedArray = TypedArray;
primordials.TypedArrayFrom = (a, c, t) =>
  $argumentCount() === 1 ? $typedArrayFromFast(TypedArray, a) : TypedArray.$from(a, c, t);
primordials.TypedArrayOf = TypedArray.of;
primordials.TypedArrayOfApply = applyBind(TypedArray.of, TypedArray);

const TypedArrayPrototype = TypedArray.prototype;
primordials.TypedArrayPrototype = TypedArrayPrototype;
primordials.TypedArrayPrototypeAt = uncurry1Args(TypedArrayPrototype.at);
primordials.TypedArrayPrototypeGetBuffer = uncurry0Args(TypedArrayPrototype.__lookupGetter__("buffer"));
primordials.TypedArrayPrototypeGetByteLength = uncurry0Args(TypedArrayPrototype.__lookupGetter__("byteLength"));
primordials.TypedArrayPrototypeGetByteOffset = uncurry0Args(TypedArrayPrototype.__lookupGetter__("byteOffset"));
primordials.TypedArrayPrototypeCopyWithin = uncurry3Args(TypedArrayPrototype.copyWithin);
primordials.TypedArrayPrototypeEntries = uncurry0Args(TypedArrayPrototype.entries);
primordials.TypedArrayPrototypeEvery = uncurry2Args(TypedArrayPrototype.every);
primordials.TypedArrayPrototypeFill = uncurry3Args(TypedArrayPrototype.fill);
primordials.TypedArrayPrototypeFilter = uncurry2Args(TypedArrayPrototype.filter);
primordials.TypedArrayPrototypeFind = uncurry2Args(TypedArrayPrototype.find);
primordials.TypedArrayPrototypeFindIndex = uncurry2Args(TypedArrayPrototype.findIndex);
primordials.TypedArrayPrototypeFindLast = uncurry2Args(TypedArrayPrototype.findLast);
primordials.TypedArrayPrototypeFindLastIndex = uncurry2Args(TypedArrayPrototype.findLastIndex);
primordials.TypedArrayPrototypeForEach = uncurry2Args(TypedArrayPrototype.forEach);
primordials.TypedArrayPrototypeIncludes = uncurry2Args(TypedArrayPrototype.includes);
primordials.TypedArrayPrototypeIndexOf = uncurry2Args(TypedArrayPrototype.indexOf);
primordials.TypedArrayPrototypeJoin = uncurry1Args(TypedArrayPrototype.join);
primordials.TypedArrayPrototypeKeys = uncurry0Args(TypedArrayPrototype.keys);
primordials.TypedArrayPrototypeLastIndexOf = uncurry2Args(TypedArrayPrototype.lastIndexOf);
primordials.TypedArrayPrototypeGetLength = a => $typedArrayLength(a);
primordials.TypedArrayPrototypeMap = uncurry2Args(TypedArrayPrototype.map);
primordials.TypedArrayPrototypeReduce = uncurry2Args(TypedArrayPrototype.reduce);
primordials.TypedArrayPrototypeReduceRight = uncurry2Args(TypedArrayPrototype.reduceRight);
primordials.TypedArrayPrototypeReverse = uncurry0Args(TypedArrayPrototype.reverse);
primordials.TypedArrayPrototypeSet = uncurry2Args(TypedArrayPrototype.set);
primordials.TypedArrayPrototypeSlice = uncurry2Args(TypedArrayPrototype.slice);
primordials.TypedArrayPrototypeSome = uncurry2Args(TypedArrayPrototype.some);
primordials.TypedArrayPrototypeSort = uncurry1Args(TypedArrayPrototype.sort);
primordials.TypedArrayPrototypeSubarray = uncurry2Args(TypedArrayPrototype.subarray);
primordials.TypedArrayPrototypeSymbolIterator = uncurry0Args(TypedArrayPrototype[SymbolIterator]);
primordials.TypedArrayPrototypeToLocaleString = uncurry2Args(TypedArrayPrototype.toLocaleString);
primordials.TypedArrayPrototypeToReversed = uncurry0Args(TypedArrayPrototype.toReversed);
primordials.TypedArrayPrototypeToSorted = uncurry1Args(TypedArrayPrototype.toSorted);
primordials.TypedArrayPrototypeToString = uncurry0Args(TypedArrayPrototype.toString);
primordials.TypedArrayPrototypeGetSymbolToStringTag = TypedArrayPrototype.__lookupGetter__(SymbolToStringTag);
primordials.TypedArrayPrototypeValues = uncurry0Args(TypedArrayPrototype.values);

const ArrayIteratorPrototype = ArrayPrototype[SymbolIterator]().__proto__;
primordials.ArrayIteratorPrototype = ArrayIteratorPrototype;
primordials.ArrayIteratorPrototypeNext = uncurry0Args(ArrayIteratorPrototype.next);

const StringIteratorPrototype = StringPrototype[SymbolIterator]().__proto__;
primordials.StringIteratorPrototype = StringIteratorPrototype;
primordials.StringIteratorPrototypeNext = uncurry0Args(StringIteratorPrototype.next);

primordials.AsyncIteratorPrototype = async function* () {}.prototype.__proto__.__proto__;
primordials.IteratorPrototype = ArrayIteratorPrototype.__proto__;

{
  const {
    Error,
    FinalizationRegistry,
    ObjectDefineProperty,
    ObjectFreeze,
    ObjectGetOwnPropertyDescriptor,
    ObjectHasOwn,
    ObjectPrototypePropertyIsEnumerable,
    PromiseAll,
    PromiseAllSettled,
    PromiseAny,
    PromiseRace,
    ReflectOwnKeys,
    RegExpPrototypeGetDotAll,
    RegExpPrototypeGetFlags,
    RegExpPrototypeGetGlobal,
    RegExpPrototypeGetHasIndices,
    RegExpPrototypeGetIgnoreCase,
    RegExpPrototypeGetMultiline,
    RegExpPrototypeGetSource,
    RegExpPrototypeGetSticky,
    RegExpPrototypeGetUnicode,
    StringPrototypeReplace,
    SymbolIterator,
    SymbolMatch,
    SymbolMatchAll,
    SymbolReplace,
    SymbolSearch,
    SymbolSpecies,
    SymbolSplit,
    WeakMap,
    WeakRef,
    WeakSet,
  } = primordials;

  // Define Error.captureStackTrace until it is defined for use in built-in scripts.
  // https://v8.dev/docs/stack-trace-api
  // TODO: Remove this polyfill once Error.captureStackTrace is available.
  primordials.ErrorCaptureStackTrace ??= (error, _ctorOpt) => {
    const { stack } = new Error();
    // Remove the second line, which is this function
    $putByValDirect(error, "stack", StringPrototypeReplace(stack, /.*\n.*/, "$1"));
  };

  // Define Symbol.dispose and Symbol.asyncDispose until they are defined by the environment.
  // TODO: Remove this polyfill once Symbol.dispose and Symbol.asyncDispose are available in JSC.
  primordials.SymbolDispose ??= SymbolFor("nodejs.dispose");
  primordials.SymbolAsyncDispose ??= SymbolFor("nodejs.asyncDispose");

  const copyProps = (to, from) => {
    const keys = ReflectOwnKeys(from);
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i];
      if (!ObjectHasOwn(to, key)) {
        if (ObjectPrototypePropertyIsEnumerable(from, key)) {
          // Getter/Setter properties are not enumerable by default.
          // Define an enumerable, writable, and configurable data property.
          $putByValDirect(to, key, from[key]);
        } else {
          // Copies non-enumerable data and accessor properties.
          // Property descriptors of built-ins are "fully populated"
          // so we don't have to null their prototype.
          // https://tc39.es/ecma262/#sec-object.getownpropertydescriptor
          // https://tc39.es/ecma262/#sec-property-descriptor-specification-type
          ObjectDefineProperty(to, key, ObjectGetOwnPropertyDescriptor(from, key));
        }
      }
    }
    return to;
  };

  const finishSafeCtor = SafeCtor => {
    $setPrototypeDirect.$call(SafeCtor.prototype, null);
    ObjectFreeze(SafeCtor.prototype);
    ObjectFreeze(SafeCtor);
    return SafeCtor;
  };

  /**
   * Creates a class that can be safely iterated over.
   *
   * Because these functions are used by `makeSafe`, which is exposed on the
   * `primordials` object, it's important to use const references to the
   * primordials that they use.
   * @template {Iterable} T
   * @template {*} TReturn
   * @template {*} TNext
   * @param {(self: T) => IterableIterator<T>} factory
   * @param {(...args: [] | [TNext]) => IteratorResult<T, TReturn>} next
   * @returns {Iterator<T, TReturn, TNext>}
   */
  const createSafeIterator = (factory, next) => {
    class SafeIterator {
      constructor(iterable) {
        this._iterator = factory(iterable);
      }
      next() {
        return next(this._iterator);
      }
      [SymbolIterator]() {
        return this;
      }
    }
    return finishSafeCtor(SafeIterator);
  };

  /**
   * @type {typeof primordials.makeSafe}
   */
  primordials.makeSafe = (unsafe, safe) => {
    const { prototype: unsafeProto } = unsafe;
    const { prototype: safeProto } = safe;
    // Assumes the built-in SymbolIterator property is non-enumerable.
    if (
      unsafeProto &&
      //ObjectHasOwn(unsafeProto, SymbolIterator) &&
      !ObjectPrototypePropertyIsEnumerable(unsafeProto, SymbolIterator)
    ) {
      const dummy = new unsafe();
      let next; // We can reuse the same `next` method.

      const keys = ReflectOwnKeys(unsafeProto);
      for (let i = 0, { length } = keys; i < length; i += 1) {
        const key = keys[i];
        if (!ObjectHasOwn(safeProto, key)) {
          if (ObjectPrototypePropertyIsEnumerable(unsafeProto, key)) {
            // Getter/Setter properties are not enumerable by default.
            // Define an enumerable, writable, and configurable data property.
            $putByValDirect(safeProto, key, unsafeProto[key]);
          } else {
            // Copies non-enumerable data and accessor properties.
            const desc = ObjectGetOwnPropertyDescriptor(unsafeProto, key);
            if (
              $isCallable(desc.value) &&
              desc.value.length === 0 &&
              SymbolIterator in (desc.value.$call(dummy) ?? {})
            ) {
              const createIterator = uncurry0Args(desc.value);
              next ??= uncurry0Args(createIterator(dummy).next);
              const SafeIterator = createSafeIterator(createIterator, next);
              // Use anonymous function expression, instead of arrow function, to keep `this` correct.
              desc.value = function () {
                return new SafeIterator(this);
              };
            }
            // Property descriptors of built-ins are "fully populated"
            // so we don't have to null their prototype.
            // https://tc39.es/ecma262/#sec-object.getownpropertydescriptor
            // https://tc39.es/ecma262/#sec-property-descriptor-specification-type
            ObjectDefineProperty(safeProto, key, desc);
          }
        }
      }
    } else {
      copyProps(safeProto, unsafeProto);
    }
    copyProps(safe, unsafe);
    return finishSafeCtor(safe);
  };

  const SafeArrayIterator = createSafeIterator(
    primordials.ArrayPrototypeSymbolIterator,
    primordials.ArrayIteratorPrototypeNext,
  );
  primordials.SafeArrayIterator = SafeArrayIterator;

  primordials.SafeStringIterator = createSafeIterator(
    primordials.StringPrototypeSymbolIterator,
    primordials.StringIteratorPrototypeNext,
  );

  // Subclass the constructors because we need to use their prototype
  // methods later.
  // Defining the `constructor` is necessary here to avoid the default
  // constructor which uses the user-mutable `%ArrayIteratorPrototype%.next`.
  primordials.SafeFinalizationRegistry = finishSafeCtor(
    class SafeFinalizationRegistry extends FinalizationRegistry {
      constructor(c) {
        super(c);
      }
      register(t, h, u) {
        FinalizationRegistryPrototypeRegisterRaw.$call(this, t, h, u);
      }
      unregister(u) {
        return FinalizationRegistryPrototypeUnregisterRaw.$call(this, u);
      }
      [SymbolToStringTag] = FinalizationRegistryPrototypeSymbolToStringTag;
    },
  );

  primordials.SafeMap = finishSafeCtor(
    class SafeMap extends $Map {
      constructor(i) {
        super(i);
      }
      clear() {
        MapPrototypeClearRaw.$call(this);
      }
      delete(k) {
        MapPrototypeDeleteRaw.$call(this, k);
      }
      entries() {
        return MapPrototypeEntriesRaw.$call(this);
      }
      forEach(c, t) {
        MapPrototypeForEachRaw.$call(this, c, t);
      }
      get(k) {
        return MapPrototypeGetRaw.$call(this, k);
      }
      has(k) {
        return MapPrototypeHasRaw.$call(this, k);
      }
      keys() {
        return MapPrototypeKeysRaw.$call(this);
      }
      set(k, v) {
        return MapPrototypeSetRaw.$call(this, k, v);
      }
      get size() {
        return this.$size;
      }
      values() {
        return MapPrototypeValuesRaw.$call(this);
      }
      [SymbolIterator]() {
        return MapPrototypeSymbolIteratorRaw.$call(this);
      }
      [SymbolToStringTag] = MapPrototypeSymbolToStringTag;
    },
  );

  primordials.SafePromise = finishSafeCtor(
    class SafePromise extends $Promise {
      static all(i) {
        return PromiseAllRaw.$call(SafePromise, i);
      }
      static allSettled(i) {
        return PromiseAllSettledRaw.$call(SafePromise, i);
      }
      static any(i) {
        return PromiseAnyRaw.$call(SafePromise, i);
      }
      static race(i) {
        return PromiseRaceRaw.$call(SafePromise, i);
      }
      static reject(v) {
        return PromiseRejectRaw.$call(SafePromise, v);
      }
      static resolve(v) {
        return PromiseResolveRaw.$call(SafePromise, v);
      }
      static withResolvers() {
        return $newPromiseCapability.$call(SafePromise);
      }
      constructor(e) {
        super(e);
      }
      catch(f) {
        return PromisePrototypeCatchRaw.$call(this, f);
      }
      finally(f) {
        return PromisePrototypeFinallyRaw.$call(this, f);
      }
      then(f, r) {
        return this.$then(f, r);
      }
    },
  );

  const arrayToSafePromiseIterable = (promises, mapFn) => {
    const { length } = promises;
    const mapped = $newArrayWithSize(length);
    if ($isCallable(mapFn)) {
      for (let i = 0; i < length; i += 1) {
        // JSInternalPromise is completely separated instance from the JSPromise.
        // Since its prototype and constructor are different from the exposed Promises' ones,
        // all the user modification onto the exposed Promise does not have effect on JSInternalPromise.
        //
        // e.g.
        //     Replacing Promise.prototype.then with the user-customized one does not effect on JSInternalPromise.
        //
        // CAUTION: Must not leak the JSInternalPromise to the user space to keep its integrity.
        const {
          promise: internalPromise,
          resolve: resolveInternal,
          reject: rejectInternal,
        } = $newPromiseCapability($InternalPromise);
        mapFn(promises[i], i).$then(resolveInternal, rejectInternal);
        $putByValDirect(mapped[i], internalPromise);
      }
    } else {
      for (let i = 0; i < length; i += 1) {
        const {
          promise: internalPromise,
          resolve: resolveInternal,
          reject: rejectInternal,
        } = $newPromiseCapability($InternalPromise);
        promises[i].$then(resolveInternal, rejectInternal);
        $putByValDirect(mapped[i], internalPromise);
      }
    }
    return new SafeArrayIterator(mapped);
  };

  primordials.SafeSet = finishSafeCtor(
    class SafeSet extends $Set {
      constructor(i) {
        super(i);
      }
      add(v) {
        SetPrototypeAddRaw.$call(this, v);
        return this;
      }
      clear() {
        SetPrototypeClearRaw.$call(this);
      }
      delete(v) {
        return SetPrototypeDeleteRaw.$call(this, v);
      }
      entries() {
        return SetPrototypeEntriesRaw.$call(this);
      }
      forEach(c, t) {
        SetPrototypeForEachRaw.$call(this, c, t);
      }
      has(v) {
        return SetPrototypeHasRaw.$call(this, v);
      }
      keys() {
        return SetPrototypeKeysRaw.$call(this);
      }
      get size() {
        return this.$size;
      }
      values() {
        return SetPrototypeValuesRaw.$call(this);
      }
      [SymbolIterator]() {
        return SetPrototypeSymbolIteratorRaw.$call(this);
      }
      [SymbolToStringTag] = SetPrototypeSymbolToStringTag;
    },
  );

  primordials.SafeWeakMap = finishSafeCtor(
    class SafeWeakMap extends WeakMap {
      constructor(i) {
        super(i);
      }
      delete(k) {
        return WeakMapPrototypeDeleteRaw.$call(this, k);
      }
      get(k) {
        return WeakMapPrototypeGetRaw.$call(this, k);
      }
      has(k) {
        return WeakMapPrototypeHasRaw.$call(this, k);
      }
      set(k, v) {
        WeakMapPrototypeSetRaw.$call(this, k, v);
        return this;
      }
      [SymbolToStringTag] = WeakMapPrototypeSymbolToStringTag;
    },
  );

  primordials.SafeWeakRef = finishSafeCtor(
    class SafeWeakRef extends WeakRef {
      constructor(i) {
        super(i);
      }
      deref() {
        return WeakRefPrototypeDerefRaw.$call(this);
      }
      [SymbolToStringTag] = WeakRefPrototypeSymbolToStringTag;
    },
  );

  primordials.SafeWeakSet = finishSafeCtor(
    class SafeWeakSet extends WeakSet {
      constructor(i) {
        super(i);
      }
      add(v) {
        WeakSetPrototypeAddRaw.$call(this, v);
        return this;
      }
      delete(v) {
        return WeakSetPrototypeDeleteRaw.$call(this, v);
      }
      has(v) {
        return WeakSetPrototypeHasRaw.$call(this, v);
      }
      [SymbolToStringTag] = WeakSetPrototypeSymbolToStringTag;
    },
  );

  /**
   * Attaches a callback that is invoked when the Promise is settled (fulfilled or
   * rejected). The resolved value cannot be modified from the callback.
   * Prefer using async functions when possible.
   * @param {Promise<any>} thisPromise
   * @param {() => void) | undefined | null} onFinally The callback to execute
   *        when the Promise is settled (fulfilled or rejected).
   * @returns {Promise} A Promise for the completion of the callback.
   */
  primordials.SafePromisePrototypeFinally = (thisPromise, onFinally) => {
    // JSInternalPromise is completely separated instance from the JSPromise.
    // Since its prototype and constructor are different from the exposed Promises' ones,
    // all the user modification onto the exposed Promise does not have effect on JSInternalPromise.
    //
    // e.g.
    //     Replacing Promise.prototype.then with the user-customized one does not effect on JSInternalPromise.
    //
    // CAUTION: Must not leak the JSInternalPromise to the user space to keep its integrity.
    const {
      promise: internalPromise,
      resolve: resolveInternal,
      reject: rejectInternal,
    } = $newPromiseCapability($InternalPromise);
    const {
      promise: userlandPromise,
      resolve: resolveUserland,
      reject: rejectUserland,
    } = $newPromiseCapability($Promise);
    internalPromise.finally(onFinally).then(resolveUserland, rejectUserland);
    thisPromise.$then(resolveInternal, rejectInternal);
    // Wrapping on a new Promise is necessary to not expose the SafePromise
    // prototype to user-land.
    return userlandPromise;
  };

  /**
   * @template T,U
   * @param {Array<T | PromiseLike<T>>} promises
   * @param {(v: T|PromiseLike<T>, k: number) => U|PromiseLike<U>} [mapFn]
   * @returns {Promise<Awaited<U>[]>}
   */
  primordials.SafePromiseAll = (promises, mapFn) => {
    // Wrapping on a new Promise is necessary to not expose the InternalPromise
    // to user-land.
    try {
      return PromiseAll(arrayToSafePromiseIterable(promises, mapFn));
    } catch (e) {
      return $Promise.$reject(e);
    }
  };

  /**
   * Should only be used for internal functions, this would produce similar
   * results as `Promise.all` but without prototype pollution, and the return
   * value is not a genuine Array but an array-like object.
   * @template T,U
   * @param {ArrayLike<T | PromiseLike<T>>} promises
   * @param {(v: T|PromiseLike<T>, k: number) => U|PromiseLike<U>} [mapFn]
   * @returns {Promise<ArrayLike<Awaited<U>>>}
   */
  primordials.SafePromiseAllReturnArrayLike = (promises, mapFn) => {
    const { length } = promises;
    const returnVal = $newArrayWithSize(length);
    $setPrototypeDirect.$call(returnVal, null);
    if (length === 0) return $Promise.$resolve(returnVal);

    let pendingPromises = length;
    const { promise, resolve, reject } = $newPromiseCapability($Promise);
    const resolveForIndex = i => result => {
      returnVal[i] = result;
      if (--pendingPromises === 0) resolve(returnVal);
    };
    try {
      if ($isCallable(mapFn)) {
        for (let i = 0; i < length; i += 1) {
          $Promise.$resolve(mapFn(promises[i], i)).$then(resolveForIndex(i), reject);
        }
      } else {
        for (let i = 0; i < length; i += 1) {
          $Promise.$resolve(promises[i]).$then(resolveForIndex(i), reject);
        }
      }
    } catch (e) {
      reject(e);
    }
    return promise;
  };

  /**
   * Should only be used when we only care about waiting for all the promises to
   * resolve, not what value they resolve to.
   * @template T,U
   * @param {ArrayLike<T | PromiseLike<T>>} promises
   * @param {(v: T|PromiseLike<T>, k: number) => U|PromiseLike<U>} [mapFn]
   * @returns {Promise<void>}
   */
  primordials.SafePromiseAllReturnVoid = (promises, mapFn) => {
    const { length } = promises;
    if (length === 0) return $Promise.$resolve();

    let pendingPromises = length;
    const { promise, resolve, reject } = $newPromiseCapability($Promise);
    const onFulfilled = () => {
      if (--pendingPromises === 0) resolve();
    };
    try {
      if ($isCallable(mapFn)) {
        for (let i = 0; i < length; i += 1) {
          $Promise.$resolve(mapFn(promises[i], i)).$then(onFulfilled, reject);
        }
      } else {
        for (let i = 0; i < length; i += 1) {
          $Promise.$resolve(promises[i]).$then(onFulfilled, reject);
        }
      }
    } catch (e) {
      reject(e);
    }
    return promise;
  };

  /**
   * @template T,U
   * @param {Array<T|PromiseLike<T>>} promises
   * @param {(v: T|PromiseLike<T>, k: number) => U|PromiseLike<U>} [mapFn]
   * @returns {Promise<PromiseSettledResult<any>[]>}
   */
  primordials.SafePromiseAllSettled = (promises, mapFn) => {
    // Wrapping on a new Promise is necessary to not expose the InternalPromise
    // to user-land.
    try {
      return PromiseAllSettled(arrayToSafePromiseIterable(promises, mapFn));
    } catch (e) {
      return $Promise.$reject(e);
    }
  };

  /**
   * Should only be used when we only care about waiting for all the promises to
   * settle, not what value they resolve or reject to.
   * @template T,U
   * @param {ArrayLike<T|PromiseLike<T>>} promises
   * @param {(v: T|PromiseLike<T>, k: number) => U|PromiseLike<U>} [mapFn]
   * @returns {Promise<void>}
   */
  primordials.SafePromiseAllSettledReturnVoid = (promises, mapFn) => {
    const { length } = promises;
    if (length === 0) return $Promise.$resolve();

    let pendingPromises = length;
    const { promise, resolve, reject } = $newPromiseCapability($Promise);
    const onSettle = () => {
      if (--pendingPromises === 0) resolve();
    };
    try {
      if ($isCallable(mapFn)) {
        for (let i = 0; i < length; i += 1) {
          $Promise.$resolve(mapFn(promises[i], i)).$then(onSettle, onSettle);
        }
      } else {
        for (let i = 0; i < length; i += 1) {
          $Promise.$resolve(promises[i]).$then(onSettle, onSettle);
        }
      }
    } catch (e) {
      reject(e);
    }
    return promise;
  };

  /**
   * @template T,U
   * @param {Array<T|PromiseLike<T>>} promises
   * @param {(v: T|PromiseLike<T>, k: number) => U|PromiseLike<U>} [mapFn]
   * @returns {Promise<Awaited<U>>}
   */
  primordials.SafePromiseAny = (promises, mapFn) => {
    // Wrapping on a new Promise is necessary to not expose the InternalPromise
    // to user-land.
    try {
      return PromiseAny(arrayToSafePromiseIterable(promises, mapFn));
    } catch (e) {
      return $Promise.$reject(e);
    }
  };

  /**
   * @template T,U
   * @param {Array<T|PromiseLike<T>>} promises
   * @param {(v: T|PromiseLike<T>, k: number) => U|PromiseLike<U>} [mapFn]
   * @returns {Promise<Awaited<U>>}
   */
  primordials.SafePromiseRace = (promises, mapFn) => {
    // Wrapping on a new Promise is necessary to not expose the InternalPromise
    // to user-land.
    try {
      return PromiseRace(arrayToSafePromiseIterable(promises, mapFn));
    } catch (e) {
      return $Promise.$reject(e);
    }
  };

  class RegExpLikeForStringSplitting {
    #regex;
    constructor(pattern, flags) {
      this.#regex = $regExpCreate(pattern, flags);
    }
    exec(string) {
      return RegExpPrototypeExecRaw.$call(this.#regex, string);
    }
    get lastIndex() {
      return this.#regex.lastIndex;
    }
    set lastIndex(value) {
      $putByValDirect(this.#regex, "lastIndex", value);
    }
  }
  $setPrototypeDirect.$call(RegExpLikeForStringSplitting.prototype, null);

  /**
   * @param {RegExp} pattern
   * @returns {RegExp}
   */
  primordials.hardenRegExp = pattern => {
    $putByValDirect(pattern, SymbolMatch, RegExpPrototypeSymbolMatchRaw);
    $putByValDirect(pattern, SymbolMatchAll, RegExpPrototypeSymbolMatchAllRaw);
    $putByValDirect(pattern, SymbolReplace, RegExpPrototypeSymbolReplaceRaw);
    $putByValDirect(pattern, SymbolSearch, RegExpPrototypeSymbolSearchRaw);
    $putByValDirect(pattern, SymbolSplit, RegExpPrototypeSymbolSplitRaw);
    $putByValDirect(pattern, "constructor", $createObjectWithoutPrototype(SymbolSpecies, RegExpLikeForStringSplitting));
    $putByValDirect(pattern, "dotAll", RegExpPrototypeGetDotAll(pattern));
    $putByValDirect(pattern, "exec", RegExpPrototypeExecRaw);
    $putByValDirect(pattern, "flags", RegExpPrototypeGetFlags(pattern));
    $putByValDirect(pattern, "global", RegExpPrototypeGetGlobal(pattern));
    $putByValDirect(pattern, "hasIndices", RegExpPrototypeGetHasIndices(pattern));
    $putByValDirect(pattern, "ignoreCase", RegExpPrototypeGetIgnoreCase(pattern));
    $putByValDirect(pattern, "multiline", RegExpPrototypeGetMultiline(pattern));
    $putByValDirect(pattern, "source", RegExpPrototypeGetSource(pattern));
    $putByValDirect(pattern, "sticky", RegExpPrototypeGetSticky(pattern));
    $putByValDirect(pattern, "unicode", RegExpPrototypeGetUnicode(pattern));
    return pattern;
  };

  /**
   * @param {string} string
   * @param {RegExp} regexp
   * @returns {number}
   */
  primordials.SafeStringPrototypeSearch = primordials.StringPrototypeSearch;

  ObjectFreeze(primordials);
}

export default primordials;
