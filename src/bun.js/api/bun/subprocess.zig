const default_allocator = @import("root").bun.default_allocator;
const bun = @import("root").bun;
const Environment = bun.Environment;

const Global = bun.Global;
const strings = bun.strings;
const string = bun.string;
const Output = @import("root").bun.Output;
const MutableString = @import("root").bun.MutableString;
const std = @import("std");
const Allocator = std.mem.Allocator;
const JSC = @import("root").bun.JSC;
const JSValue = JSC.JSValue;
const JSGlobalObject = JSC.JSGlobalObject;
const Which = @import("../../../which.zig");
const Async = bun.Async;
const IPC = @import("../../ipc.zig");
const uws = bun.uws;
const windows = bun.windows;
const uv = windows.libuv;
const LifecycleScriptSubprocess = bun.install.LifecycleScriptSubprocess;
const Body = JSC.WebCore.Body;

const PosixSpawn = bun.posix.spawn;
const Rusage = bun.posix.spawn.Rusage;
const Process = bun.posix.spawn.Process;
const WaiterThread = bun.posix.spawn.WaiterThread;
const Stdio = bun.spawn.Stdio;

pub const ResourceUsage = struct {
    pub usingnamespace JSC.Codegen.JSResourceUsage;
    rusage: Rusage,

    pub fn constructor(
        _: *JSC.JSGlobalObject,
        _: *JSC.CallFrame,
    ) callconv(.C) ?*Subprocess {
        return null;
    }

    pub fn getCPUTime(
        this: *ResourceUsage,
        globalObject: *JSGlobalObject,
    ) callconv(.C) JSValue {
        var cpu = JSC.JSValue.createEmptyObjectWithNullPrototype(globalObject);
        const rusage = this.rusage;

        const usrTime = JSValue.fromTimevalNoTruncate(globalObject, rusage.utime.tv_usec, rusage.utime.tv_sec);
        const sysTime = JSValue.fromTimevalNoTruncate(globalObject, rusage.stime.tv_usec, rusage.stime.tv_sec);

        cpu.put(globalObject, JSC.ZigString.static("user"), usrTime);
        cpu.put(globalObject, JSC.ZigString.static("system"), sysTime);
        cpu.put(globalObject, JSC.ZigString.static("total"), JSValue.bigIntSum(globalObject, usrTime, sysTime));

        return cpu;
    }

    pub fn getMaxRSS(
        this: *ResourceUsage,
        _: *JSGlobalObject,
    ) callconv(.C) JSValue {
        return JSC.JSValue.jsNumber(this.rusage.maxrss);
    }

    pub fn getSharedMemorySize(
        this: *ResourceUsage,
        _: *JSGlobalObject,
    ) callconv(.C) JSValue {
        return JSC.JSValue.jsNumber(this.rusage.ixrss);
    }

    pub fn getSwapCount(
        this: *ResourceUsage,
        _: *JSGlobalObject,
    ) callconv(.C) JSValue {
        return JSC.JSValue.jsNumber(this.rusage.nswap);
    }

    pub fn getOps(
        this: *ResourceUsage,
        globalObject: *JSGlobalObject,
    ) callconv(.C) JSValue {
        var ops = JSC.JSValue.createEmptyObjectWithNullPrototype(globalObject);
        ops.put(globalObject, JSC.ZigString.static("in"), JSC.JSValue.jsNumber(this.rusage.inblock));
        ops.put(globalObject, JSC.ZigString.static("out"), JSC.JSValue.jsNumber(this.rusage.oublock));
        return ops;
    }

    pub fn getMessages(
        this: *ResourceUsage,
        globalObject: *JSGlobalObject,
    ) callconv(.C) JSValue {
        var msgs = JSC.JSValue.createEmptyObjectWithNullPrototype(globalObject);
        msgs.put(globalObject, JSC.ZigString.static("sent"), JSC.JSValue.jsNumber(this.rusage.msgsnd));
        msgs.put(globalObject, JSC.ZigString.static("received"), JSC.JSValue.jsNumber(this.rusage.msgrcv));
        return msgs;
    }

    pub fn getSignalCount(
        this: *ResourceUsage,
        _: *JSGlobalObject,
    ) callconv(.C) JSValue {
        return JSC.JSValue.jsNumber(this.rusage.nsignals);
    }

    pub fn getContextSwitches(
        this: *ResourceUsage,
        globalObject: *JSGlobalObject,
    ) callconv(.C) JSValue {
        var ctx = JSC.JSValue.createEmptyObjectWithNullPrototype(globalObject);
        ctx.put(globalObject, JSC.ZigString.static("voluntary"), JSC.JSValue.jsNumber(this.rusage.nvcsw));
        ctx.put(globalObject, JSC.ZigString.static("involuntary"), JSC.JSValue.jsNumber(this.rusage.nivcsw));
        return ctx;
    }

    pub fn finalize(this: *ResourceUsage) callconv(.C) void {
        bun.default_allocator.destroy(this);
    }
};

pub const Subprocess = struct {
    const log = Output.scoped(.Subprocess, false);
    pub usingnamespace JSC.Codegen.JSSubprocess;
    const default_max_buffer_size = 1024 * 1024 * 4;
    pub const StdioKind = enum {
        stdin,
        stdout,
        stderr,
    };
    process: *Process = undefined,
    stdin: Writable,
    stdout: Readable,
    stderr: Readable,
    stdio_pipes: std.ArrayListUnmanaged(bun.FileDescriptor) = .{},
    pid_rusage: ?Rusage = null,

    exit_promise: JSC.Strong = .{},
    on_exit_callback: JSC.Strong = .{},

    globalThis: *JSC.JSGlobalObject,
    observable_getters: std.enums.EnumSet(enum {
        stdin,
        stdout,
        stderr,
        stdio,
    }) = .{},
    closed: std.enums.EnumSet(StdioKind) = .{},
    has_pending_activity: std.atomic.Value(bool) = std.atomic.Value(bool).init(true),
    this_jsvalue: JSC.JSValue = .zero,

    ipc_mode: IPCMode,
    ipc_callback: JSC.Strong = .{},
    ipc: IPC.IPCData,
    flags: Flags = .{},

    weak_file_sink_stdin_ptr: ?*JSC.WebCore.FileSink = null,

    pub const Flags = packed struct {
        is_sync: bool = false,
        killed: bool = false,
        has_stdin_destructor_called: bool = false,
    };

    pub const SignalCode = bun.SignalCode;

    pub const IPCMode = enum {
        none,
        bun,
        // json,
    };

    pub fn resourceUsage(
        this: *Subprocess,
        globalObject: *JSGlobalObject,
        _: *JSC.CallFrame,
    ) callconv(.C) JSValue {
        return this.createResourceUsageObject(globalObject);
    }

    pub fn createResourceUsageObject(
        this: *Subprocess,
        globalObject: *JSGlobalObject,
    ) JSValue {
        const pid_rusage = this.pid_rusage orelse brk: {
            if (Environment.isWindows) {
                if (this.process.poller == .uv) {
                    this.pid_rusage = PosixSpawn.uv_getrusage(&this.process.poller.uv);
                    break :brk this.pid_rusage.?;
                }
            }

            return JSValue.jsUndefined();
        };

        const resource_usage = ResourceUsage{
            .rusage = pid_rusage,
        };

        var result = bun.default_allocator.create(ResourceUsage) catch {
            globalObject.throwOutOfMemory();
            return .zero;
        };
        result.* = resource_usage;
        return result.toJS(globalObject);
    }

    pub fn hasExited(this: *const Subprocess) bool {
        return this.process.hasExited();
    }

    pub fn hasPendingActivityNonThreadsafe(this: *const Subprocess) bool {
        if (this.ipc_mode != .none) {
            return true;
        }

        if (this.hasPendingActivityStdio()) {
            return true;
        }

        return this.process.hasRef();
    }

    pub fn updateHasPendingActivity(this: *Subprocess) void {
        @fence(.SeqCst);
        if (comptime Environment.isDebug) {
            log("updateHasPendingActivity() {any} -> {any}", .{
                this.has_pending_activity.raw,
                this.hasPendingActivityNonThreadsafe(),
            });
        }
        this.has_pending_activity.store(
            this.hasPendingActivityNonThreadsafe(),
            .Monotonic,
        );
    }

    pub fn hasPendingActivityStdio(this: *const Subprocess) bool {
        if (this.stdin.hasPendingActivity()) {
            return true;
        }

        inline for (.{ StdioKind.stdout, StdioKind.stderr }) |kind| {
            if (@field(this, @tagName(kind)).hasPendingActivity()) {
                return true;
            }
        }

        return false;
    }

    pub fn onCloseIO(this: *Subprocess, kind: StdioKind) void {
        switch (kind) {
            .stdin => {
                switch (this.stdin) {
                    .pipe => |pipe| {
                        pipe.signal.clear();
                        pipe.deref();
                        this.stdin = .{ .ignore = {} };
                    },
                    .buffer => {
                        this.stdin.buffer.source.detach();
                        this.stdin.buffer.deref();
                        this.stdin = .{ .ignore = {} };
                    },
                    else => {},
                }
            },
            inline .stdout, .stderr => |tag| {
                const out: *Readable = &@field(this, @tagName(tag));
                switch (out.*) {
                    .pipe => |pipe| {
                        if (pipe.state == .done) {
                            out.* = .{ .buffer = pipe.state.done };
                            pipe.state = .{ .done = &.{} };
                        } else {
                            out.* = .{ .ignore = {} };
                        }
                        pipe.deref();
                    },
                    else => {},
                }
            },
        }
    }

    pub fn hasPendingActivity(this: *Subprocess) callconv(.C) bool {
        @fence(.Acquire);
        return this.has_pending_activity.load(.Acquire);
    }

    pub fn ref(this: *Subprocess) void {
        this.process.enableKeepingEventLoopAlive();

        if (!this.hasCalledGetter(.stdin)) {
            this.stdin.ref();
        }

        if (!this.hasCalledGetter(.stdout)) {
            this.stdout.ref();
        }

        if (!this.hasCalledGetter(.stderr)) {
            this.stdout.ref();
        }
    }

    /// This disables the keeping process alive flag on the poll and also in the stdin, stdout, and stderr
    pub fn unref(this: *Subprocess, comptime _: bool) void {
        this.process.disableKeepingEventLoopAlive();

        if (!this.hasCalledGetter(.stdin)) {
            this.stdin.unref();
        }

        if (!this.hasCalledGetter(.stdout)) {
            this.stdout.unref();
        }

        if (!this.hasCalledGetter(.stderr)) {
            this.stdout.unref();
        }
    }

    pub fn constructor(
        _: *JSC.JSGlobalObject,
        _: *JSC.CallFrame,
    ) callconv(.C) ?*Subprocess {
        return null;
    }

    const Readable = union(enum) {
        fd: bun.FileDescriptor,
        memfd: bun.FileDescriptor,
        pipe: *PipeReader,
        inherit: void,
        ignore: void,
        closed: void,
        buffer: []u8,

        pub fn hasPendingActivity(this: *const Readable) bool {
            return switch (this.*) {
                .pipe => this.pipe.hasPendingActivity(),
                else => false,
            };
        }

        pub fn ref(this: *Readable) void {
            switch (this.*) {
                .pipe => {
                    this.pipe.updateRef(true);
                },
                else => {},
            }
        }

        pub fn unref(this: *Readable) void {
            switch (this.*) {
                .pipe => {
                    this.pipe.updateRef(false);
                },
                else => {},
            }
        }

        pub fn init(stdio: Stdio, event_loop: *JSC.EventLoop, process: *Subprocess, fd: ?bun.FileDescriptor, allocator: std.mem.Allocator, max_size: u32, is_sync: bool) Readable {
            _ = allocator; // autofix
            _ = max_size; // autofix
            _ = is_sync; // autofix
            if (comptime Environment.allow_assert) {
                if (fd) |fd_| {
                    std.debug.assert(fd_ != bun.invalid_fd);
                }
            }

            return switch (stdio) {
                .inherit => Readable{ .inherit = {} },
                .ignore => Readable{ .ignore = {} },
                .path => Readable{ .ignore = {} },
                .fd => Readable{ .fd = fd.? },
                .memfd => Readable{ .memfd = stdio.memfd },
                .pipe => Readable{ .pipe = PipeReader.create(event_loop, process, fd.?) },
                .array_buffer, .blob => Output.panic("TODO: implement ArrayBuffer & Blob support in Stdio readable", .{}),
                .capture => Output.panic("TODO: implement capture support in Stdio readable", .{}),
                .socket => unreachable,
            };
        }

        pub fn onClose(this: *Readable, _: ?bun.sys.Error) void {
            this.* = .closed;
        }

        pub fn onReady(_: *Readable, _: ?JSC.WebCore.Blob.SizeType, _: ?JSC.WebCore.Blob.SizeType) void {}

        pub fn onStart(_: *Readable) void {}

        pub fn close(this: *Readable) void {
            switch (this.*) {
                inline .memfd, .fd => |fd| {
                    this.* = .{ .closed = {} };
                    _ = bun.sys.close(fd);
                },
                .pipe => {
                    this.pipe.close();
                },
                else => {},
            }
        }

        pub fn finalize(this: *Readable) void {
            switch (this.*) {
                inline .memfd, .fd => |fd| {
                    this.* = .{ .closed = {} };
                    _ = bun.sys.close(fd);
                },
                .pipe => |pipe| {
                    defer pipe.detach();
                    this.* = .{ .closed = {} };
                },
                else => {},
            }
        }

        pub fn toJS(this: *Readable, globalThis: *JSC.JSGlobalObject, exited: bool) JSValue {
            _ = exited; // autofix
            switch (this.*) {
                // should only be reachable when the entire output is buffered.
                .memfd => return this.toBufferedValue(globalThis),

                .fd => |fd| {
                    return JSValue.jsNumber(fd);
                },
                .pipe => |pipe| {
                    defer pipe.detach();
                    this.* = .{ .closed = {} };
                    return pipe.toJS(globalThis);
                },
                .buffer => |buffer| {
                    defer this.* = .{ .closed = {} };

                    if (buffer.len == 0) {
                        return JSC.WebCore.ReadableStream.empty(globalThis);
                    }

                    const blob = JSC.WebCore.Blob.init(buffer, bun.default_allocator, globalThis);
                    return JSC.WebCore.ReadableStream.fromBlob(globalThis, &blob, 0);
                },
                else => {
                    return JSValue.jsUndefined();
                },
            }
        }

        pub fn toBufferedValue(this: *Readable, globalThis: *JSC.JSGlobalObject) JSValue {
            switch (this.*) {
                .fd => |fd| {
                    return JSValue.jsNumber(fd);
                },
                .memfd => |fd| {
                    if (comptime !Environment.isPosix) {
                        Output.panic("memfd is only supported on Linux", .{});
                    }
                    this.* = .{ .closed = {} };
                    return JSC.ArrayBuffer.toJSBufferFromMemfd(fd, globalThis);
                },
                .pipe => |pipe| {
                    defer pipe.detach();
                    this.* = .{ .closed = {} };
                    return pipe.toBuffer(globalThis);
                },
                .buffer => |buf| {
                    this.* = .{ .closed = {} };

                    return JSC.MarkedArrayBuffer.fromBytes(buf, bun.default_allocator, .Uint8Array).toNodeBuffer(globalThis);
                },
                else => {
                    return JSValue.jsUndefined();
                },
            }
        }
    };

    pub fn getStderr(
        this: *Subprocess,
        globalThis: *JSGlobalObject,
    ) callconv(.C) JSValue {
        this.observable_getters.insert(.stderr);
        return this.stderr.toJS(globalThis, this.hasExited());
    }

    pub fn getStdin(
        this: *Subprocess,
        globalThis: *JSGlobalObject,
    ) callconv(.C) JSValue {
        this.observable_getters.insert(.stdin);
        return this.stdin.toJS(globalThis, this);
    }

    pub fn getStdout(
        this: *Subprocess,
        globalThis: *JSGlobalObject,
    ) callconv(.C) JSValue {
        this.observable_getters.insert(.stdout);
        return this.stdout.toJS(globalThis, this.hasExited());
    }

    pub fn kill(
        this: *Subprocess,
        globalThis: *JSGlobalObject,
        callframe: *JSC.CallFrame,
    ) callconv(.C) JSValue {
        this.this_jsvalue = callframe.this();

        var arguments = callframe.arguments(1);
        // If signal is 0, then no actual signal is sent, but error checking
        // is still performed.
        var sig: i32 = 1;

        if (arguments.len > 0) {
            sig = arguments.ptr[0].coerce(i32, globalThis);
        }

        if (!(sig >= 0 and sig <= std.math.maxInt(u8))) {
            globalThis.throwInvalidArguments("Invalid signal: must be >= 0 and <= 255", .{});
            return .zero;
        }

        switch (this.tryKill(sig)) {
            .result => {},
            .err => |err| {
                globalThis.throwValue(err.toJSC(globalThis));
                return .zero;
            },
        }

        return JSValue.jsUndefined();
    }

    pub fn hasKilled(this: *const Subprocess) bool {
        return this.process.hasKilled();
    }

    pub fn tryKill(this: *Subprocess, sig: i32) JSC.Node.Maybe(void) {
        if (this.hasExited()) {
            return .{ .result = {} };
        }

        return this.process.kill(@intCast(sig));
    }

    fn hasCalledGetter(this: *Subprocess, comptime getter: @Type(.EnumLiteral)) bool {
        return this.observable_getters.contains(getter);
    }

    fn closeProcess(this: *Subprocess) void {
        if (comptime !Environment.isLinux) {
            return;
        }
        this.process.close();
    }

    pub fn doRef(this: *Subprocess, _: *JSC.JSGlobalObject, _: *JSC.CallFrame) callconv(.C) JSValue {
        this.ref();
        return JSC.JSValue.jsUndefined();
    }

    pub fn doUnref(this: *Subprocess, _: *JSC.JSGlobalObject, _: *JSC.CallFrame) callconv(.C) JSValue {
        this.unref(false);
        return JSC.JSValue.jsUndefined();
    }

    pub fn onStdinDestroyed(this: *Subprocess) void {
        this.flags.has_stdin_destructor_called = true;
        this.weak_file_sink_stdin_ptr = null;
    }

    pub fn doSend(this: *Subprocess, global: *JSC.JSGlobalObject, callFrame: *JSC.CallFrame) callconv(.C) JSValue {
        if (this.ipc_mode == .none) {
            global.throw("Subprocess.send() can only be used if an IPC channel is open.", .{});
            return .zero;
        }

        if (callFrame.argumentsCount() == 0) {
            global.throwInvalidArguments("Subprocess.send() requires one argument", .{});
            return .zero;
        }

        const value = callFrame.argument(0);

        const success = this.ipc.serializeAndSend(global, value);
        if (!success) return .zero;

        return JSC.JSValue.jsUndefined();
    }

    pub fn disconnect(this: *Subprocess) void {
        if (this.ipc_mode == .none) return;
        this.ipc.socket.close(0, null);
        this.ipc_mode = .none;
    }

    pub fn pid(this: *const Subprocess) i32 {
        return @intCast(this.process.pid);
    }

    pub fn getPid(
        this: *Subprocess,
        _: *JSGlobalObject,
    ) callconv(.C) JSValue {
        return JSValue.jsNumber(this.pid());
    }

    pub fn getKilled(
        this: *Subprocess,
        _: *JSGlobalObject,
    ) callconv(.C) JSValue {
        return JSValue.jsBoolean(this.hasKilled());
    }

    pub fn getStdio(
        this: *Subprocess,
        global: *JSGlobalObject,
    ) callconv(.C) JSValue {
        const array = JSValue.createEmptyArray(global, 0);
        array.push(global, .null);
        array.push(global, .null); // TODO: align this with options
        array.push(global, .null); // TODO: align this with options

        this.observable_getters.insert(.stdio);
        var pipes = this.stdio_pipes.items;
        if (this.ipc_mode != .none) {
            array.push(global, .null);
            pipes = pipes[@min(1, pipes.len)..];
        }

        for (pipes) |item| {
            array.push(global, JSValue.jsNumber(item.cast()));
        }
        return array;
    }

    pub const Source = union(enum) {
        blob: JSC.WebCore.AnyBlob,
        array_buffer: JSC.ArrayBuffer.Strong,
        detached: void,

        pub fn slice(this: *const Source) []const u8 {
            return switch (this.*) {
                .blob => this.blob.slice(),
                .array_buffer => this.array_buffer.slice(),
                else => @panic("Invalid source"),
            };
        }

        pub fn detach(this: *@This()) void {
            switch (this.*) {
                .blob => {
                    this.blob.detach();
                },
                .array_buffer => {
                    this.array_buffer.deinit();
                },
                else => {},
            }
            this.* = .detached;
        }
    };

    pub const StaticPipeWriter = NewStaticPipeWriter(Subprocess);

    pub fn NewStaticPipeWriter(comptime ProcessType: type) type {
        return struct {
            writer: IOWriter = .{},
            fd: bun.FileDescriptor = bun.invalid_fd,
            source: Source = .{ .detached = {} },
            process: *ProcessType = undefined,
            event_loop: JSC.EventLoopHandle,
            ref_count: u32 = 1,
            buffer: []const u8 = "",

            pub usingnamespace bun.NewRefCounted(@This(), deinit);
            const This = @This();

            pub const IOWriter = bun.io.BufferedWriter(
                This,
                onWrite,
                onError,
                onClose,
                getBuffer,
                flush,
            );
            pub const Poll = IOWriter;

            pub fn updateRef(this: *This, add: bool) void {
                this.writer.updateRef(this.event_loop, add);
            }

            pub fn getBuffer(this: *This) []const u8 {
                return this.buffer;
            }

            pub fn close(this: *This) void {
                this.writer.close();
            }

            pub fn flush(this: *This) void {
                if (this.buffer.len > 0)
                    this.writer.write();
            }

            pub fn create(event_loop: anytype, subprocess: *ProcessType, fd: bun.FileDescriptor, source: Source) *This {
                const instance = This.new(.{
                    .event_loop = JSC.EventLoopHandle.init(event_loop),
                    .process = subprocess,
                    .fd = fd,
                    .source = source,
                });
                instance.writer.setParent(instance);
                return instance;
            }

            pub fn start(this: *This) JSC.Maybe(void) {
                this.ref();
                this.buffer = this.source.slice();

                return this.writer.start(this.fd, true);
            }

            pub fn onWrite(this: *This, amount: usize, is_done: bool) void {
                this.buffer = this.buffer[@min(amount, this.buffer.len)..];
                if (is_done or this.buffer.len == 0) {
                    this.writer.close();
                }
            }

            pub fn onError(this: *This, err: bun.sys.Error) void {
                _ = err; // autofix
                this.source.detach();
            }

            pub fn onClose(this: *This) void {
                this.source.detach();
                this.process.onCloseIO(.stdin);
            }

            pub fn deinit(this: *This) void {
                this.writer.end();
                this.source.detach();
                this.destroy();
            }

            pub fn loop(this: *This) *uws.Loop {
                return this.event_loop.loop();
            }

            pub fn watch(this: *This) void {
                if (this.buffer.len > 0) {
                    this.writer.watch();
                }
            }

            pub fn eventLoop(this: *This) JSC.EventLoopHandle {
                return this.event_loop;
            }
        };
    }

    pub const PipeReader = struct {
        reader: IOReader = undefined,
        process: ?*Subprocess = null,
        event_loop: *JSC.EventLoop = undefined,
        ref_count: u32 = 1,
        state: union(enum) {
            pending: void,
            done: []u8,
            err: bun.sys.Error,
        } = .{ .pending = {} },
        fd: bun.FileDescriptor = bun.invalid_fd,

        pub const IOReader = bun.io.BufferedReader;
        pub const Poll = IOReader;

        pub usingnamespace bun.NewRefCounted(PipeReader, deinit);

        pub fn hasPendingActivity(this: *const PipeReader) bool {
            if (this.state == .pending)
                return true;

            return this.reader.hasPendingActivity();
        }

        pub fn detach(this: *PipeReader) void {
            this.process = null;
            this.deref();
        }

        pub fn create(event_loop: *JSC.EventLoop, process: *Subprocess, fd: bun.FileDescriptor) *PipeReader {
            var this = PipeReader.new(.{
                .process = process,
                .event_loop = event_loop,
                .fd = fd,
                .reader = IOReader.init(@This()),
            });
            this.reader.setParent(this);
            return this;
        }

        pub fn readAll(this: *PipeReader) void {
            if (this.state == .pending)
                this.reader.read();
        }

        pub fn start(this: *PipeReader, process: *Subprocess, event_loop: *JSC.EventLoop) JSC.Maybe(void) {
            this.ref();
            this.process = process;
            this.event_loop = event_loop;

            return this.reader.start(this.fd, true);
        }

        pub const toJS = toReadableStream;

        pub fn onReaderDone(this: *PipeReader) void {
            const owned = this.toOwnedSlice();
            this.state = .{ .done = owned };
            if (this.process) |process| {
                this.process = null;
                process.onCloseIO(this.kind(process));
                this.deref();
            }
        }

        pub fn kind(reader: *const PipeReader, process: *const Subprocess) StdioKind {
            if (process.stdout == .pipe and process.stdout.pipe == reader) {
                return .stdout;
            }

            if (process.stderr == .pipe and process.stderr.pipe == reader) {
                return .stderr;
            }

            @panic("We should be either stdout or stderr");
        }

        pub fn toOwnedSlice(this: *PipeReader) []u8 {
            if (this.state == .done) {
                return this.state.done;
            }
            // we do not use .toOwnedSlice() because we don't want to reallocate memory.
            const out = this.reader._buffer;
            this.reader._buffer.items = &.{};
            this.reader._buffer.capacity = 0;
            return out.items;
        }

        pub fn setFd(this: *PipeReader, fd: bun.FileDescriptor) *PipeReader {
            this.fd = fd;
            return this;
        }

        pub fn updateRef(this: *PipeReader, add: bool) void {
            this.reader.updateRef(add);
        }

        pub fn watch(this: *PipeReader) void {
            if (!this.reader.isDone())
                this.reader.watch();
        }

        pub fn toReadableStream(this: *PipeReader, globalObject: *JSC.JSGlobalObject) JSC.JSValue {
            defer this.detach();

            switch (this.state) {
                .pending => {
                    const stream = JSC.WebCore.ReadableStream.fromPipe(globalObject, this, &this.reader);
                    this.state = .{ .done = &.{} };
                    return stream;
                },
                .done => |bytes| {
                    const blob = JSC.WebCore.Blob.init(bytes, bun.default_allocator, globalObject);
                    this.state = .{ .done = &.{} };
                    return JSC.WebCore.ReadableStream.fromBlob(globalObject, &blob, 0);
                },
                .err => |err| {
                    _ = err; // autofix
                    const empty = JSC.WebCore.ReadableStream.empty(globalObject);
                    JSC.WebCore.ReadableStream.cancel(&JSC.WebCore.ReadableStream.fromJS(empty, globalObject).?, globalObject);
                    return empty;
                },
            }
        }

        pub fn toBuffer(this: *PipeReader, globalThis: *JSC.JSGlobalObject) JSC.JSValue {
            switch (this.state) {
                .done => |bytes| {
                    defer this.state = .{ .done = &.{} };
                    return JSC.MarkedArrayBuffer.fromBytes(bytes, bun.default_allocator, .Uint8Array).toNodeBuffer(globalThis);
                },
                else => {
                    return JSC.JSValue.undefined;
                },
            }
        }

        pub fn onReaderError(this: *PipeReader, err: bun.sys.Error) void {
            if (this.state == .done) {
                bun.default_allocator.free(this.state.done);
            }
            this.state = .{ .err = err };
            if (this.process) |process|
                process.onCloseIO(this.kind(process));
        }

        pub fn close(this: *PipeReader) void {
            switch (this.state) {
                .pending => {
                    this.reader.close();
                },
                .done => {},
                .err => {},
            }
        }

        pub fn eventLoop(this: *PipeReader) *JSC.EventLoop {
            return this.event_loop;
        }

        pub fn loop(this: *PipeReader) *uws.Loop {
            return this.event_loop.virtual_machine.uwsLoop();
        }

        fn deinit(this: *PipeReader) void {
            if (comptime Environment.isPosix) {
                std.debug.assert(this.reader.isDone());
            }

            if (comptime Environment.isWindows) {
                std.debug.assert(this.reader.pipe.isClosed());
            }

            if (this.state == .done) {
                bun.default_allocator.free(this.state.done);
            }

            this.reader.deinit();
            this.destroy();
        }
    };

    const Writable = union(enum) {
        pipe: *JSC.WebCore.FileSink,
        fd: bun.FileDescriptor,
        buffer: *StaticPipeWriter,
        memfd: bun.FileDescriptor,
        inherit: void,
        ignore: void,

        pub fn hasPendingActivity(this: *const Writable) bool {
            return switch (this.*) {
                // we mark them as .ignore when they are closed, so this must be true
                .pipe => true,
                .buffer => true,
                else => false,
            };
        }

        pub fn ref(this: *Writable) void {
            switch (this.*) {
                .pipe => {
                    this.pipe.updateRef(true);
                },
                .buffer => {
                    this.buffer.updateRef(true);
                },
                else => {},
            }
        }

        pub fn unref(this: *Writable) void {
            switch (this.*) {
                .pipe => {
                    this.pipe.updateRef(false);
                },
                .buffer => {
                    this.buffer.updateRef(false);
                },
                else => {},
            }
        }

        // When the stream has closed we need to be notified to prevent a use-after-free
        // We can test for this use-after-free by enabling hot module reloading on a file and then saving it twice
        pub fn onClose(this: *Writable, _: ?bun.sys.Error) void {
            switch (this.*) {
                .buffer => {
                    this.buffer.deref();
                },
                .pipe => {
                    this.pipe.deref();
                },
                else => {},
            }
            this.* = .{
                .ignore = {},
            };
        }
        pub fn onReady(_: *Writable, _: ?JSC.WebCore.Blob.SizeType, _: ?JSC.WebCore.Blob.SizeType) void {}
        pub fn onStart(_: *Writable) void {}

        pub fn init(
            stdio: Stdio,
            event_loop: *JSC.EventLoop,
            subprocess: *Subprocess,
            fd: ?bun.FileDescriptor,
        ) !Writable {
            if (comptime Environment.allow_assert) {
                if (fd) |fd_| {
                    std.debug.assert(fd_ != bun.invalid_fd);
                }
            }

            switch (stdio) {
                .pipe => {
                    const pipe = JSC.WebCore.FileSink.create(event_loop, fd.?);
                    pipe.writer.setParent(pipe);

                    switch (pipe.writer.start(pipe.fd, true)) {
                        .result => {},
                        .err => |err| {
                            _ = err; // autofix
                            pipe.deref();
                            return error.UnexpectedCreatingStdin;
                        },
                    }

                    subprocess.weak_file_sink_stdin_ptr = pipe;
                    subprocess.flags.has_stdin_destructor_called = false;

                    return Writable{
                        .pipe = pipe,
                    };
                },

                .blob => |blob| {
                    return Writable{
                        .buffer = StaticPipeWriter.create(event_loop, subprocess, fd.?, .{ .blob = blob }),
                    };
                },
                .array_buffer => |array_buffer| {
                    return Writable{
                        .buffer = StaticPipeWriter.create(event_loop, subprocess, fd.?, .{ .array_buffer = array_buffer }),
                    };
                },
                .memfd => |memfd| {
                    std.debug.assert(memfd != bun.invalid_fd);
                    return Writable{ .memfd = memfd };
                },
                .fd => {
                    std.debug.assert(fd.? != bun.invalid_fd);
                    return Writable{ .fd = fd.? };
                },
                .inherit => {
                    return Writable{ .inherit = {} };
                },
                .path, .ignore => {
                    return Writable{ .ignore = {} };
                },
                .capture => {
                    return Writable{ .ignore = {} };
                },
            }
        }

        pub fn toJS(this: *Writable, globalThis: *JSC.JSGlobalObject, subprocess: *Subprocess) JSValue {
            return switch (this.*) {
                .fd => |fd| JSValue.jsNumber(fd),
                .memfd, .ignore => JSValue.jsUndefined(),
                .buffer, .inherit => JSValue.jsUndefined(),
                .pipe => |pipe| {
                    this.* = .{ .ignore = {} };
                    if (subprocess.process.hasExited() and !subprocess.flags.has_stdin_destructor_called) {
                        pipe.onAttachedProcessExit();
                        return pipe.toJS(globalThis);
                    } else {
                        subprocess.flags.has_stdin_destructor_called = false;
                        subprocess.weak_file_sink_stdin_ptr = pipe;
                        return pipe.toJSWithDestructor(
                            globalThis,
                            JSC.WebCore.SinkDestructor.Ptr.init(subprocess),
                        );
                    }
                },
            };
        }

        pub fn finalize(this: *Writable) void {
            const subprocess = @fieldParentPtr(Subprocess, "stdin", this);
            if (subprocess.this_jsvalue != .zero) {
                if (JSC.Codegen.JSSubprocess.stdinGetCached(subprocess.this_jsvalue)) |existing_value| {
                    JSC.WebCore.FileSink.JSSink.setDestroyCallback(existing_value, 0);
                }
            }

            return switch (this.*) {
                .pipe => |pipe| {
                    pipe.deref();

                    this.* = .{ .ignore = {} };
                },
                .buffer => {
                    this.buffer.updateRef(false);
                    this.buffer.deref();
                },
                .memfd => |fd| {
                    _ = bun.sys.close(fd);
                    this.* = .{ .ignore = {} };
                },
                .ignore => {},
                .fd, .inherit => {},
            };
        }

        pub fn close(this: *Writable) void {
            switch (this.*) {
                .pipe => |pipe| {
                    _ = pipe.end(null);
                },
                inline .memfd, .fd => |fd| {
                    _ = bun.sys.close(fd);
                    this.* = .{ .ignore = {} };
                },
                .buffer => {
                    this.buffer.close();
                },
                .ignore => {},
                .inherit => {},
            }
        }
    };

    pub fn onProcessExit(this: *Subprocess, _: *Process, status: bun.spawn.Status, rusage: *const Rusage) void {
        log("onProcessExit()", .{});
        const this_jsvalue = this.this_jsvalue;
        const globalThis = this.globalThis;
        this_jsvalue.ensureStillAlive();
        this.pid_rusage = rusage.*;
        const is_sync = this.flags.is_sync;
        if (this.weak_file_sink_stdin_ptr) |pipe| {
            this.weak_file_sink_stdin_ptr = null;
            this.flags.has_stdin_destructor_called = true;
            if (this_jsvalue != .zero) {
                if (JSC.Codegen.JSSubprocess.stdinGetCached(this_jsvalue)) |existing_value| {
                    JSC.WebCore.FileSink.JSSink.setDestroyCallback(existing_value, 0);
                }
            }

            pipe.onAttachedProcessExit();
        } else if (this.stdin == .buffer) {
            this.stdin.buffer.close();
        }

        defer {
            this.updateHasPendingActivity();
        }
        const loop = globalThis.bunVM().eventLoop();

        if (!is_sync) {
            if (this.exit_promise.trySwap()) |promise| {
                loop.enter();
                defer loop.exit();

                switch (status) {
                    .exited => |exited| promise.asAnyPromise().?.resolve(globalThis, JSValue.jsNumber(exited.code)),
                    .err => |err| promise.asAnyPromise().?.reject(globalThis, err.toJSC(globalThis)),
                    .signaled => promise.asAnyPromise().?.resolve(globalThis, JSValue.jsNumber(128 +% @intFromEnum(status.signaled))),
                    else => {
                        // crash in debug mode
                        if (comptime Environment.allow_assert)
                            unreachable;
                    },
                }
            }

            if (this.on_exit_callback.trySwap()) |callback| {
                const waitpid_value: JSValue =
                    if (status == .err)
                    status.err.toJSC(globalThis)
                else
                    JSC.JSValue.jsUndefined();

                const this_value = if (this_jsvalue.isEmptyOrUndefinedOrNull()) JSC.JSValue.jsUndefined() else this_jsvalue;
                this_value.ensureStillAlive();

                const args = [_]JSValue{
                    this_value,
                    this.getExitCode(globalThis),
                    this.getSignalCode(globalThis),
                    waitpid_value,
                };

                loop.runCallback(
                    callback,
                    globalThis,
                    this_value,
                    &args,
                );
            }
        }
    }

    fn closeIO(this: *Subprocess, comptime io: @Type(.EnumLiteral)) void {
        if (this.closed.contains(io)) return;
        this.closed.insert(io);

        // If you never referenced stdout/stderr, they won't be garbage collected.
        //
        // That means:
        //   1. We need to stop watching them
        //   2. We need to free the memory
        //   3. We need to halt any pending reads (1)

        if (!this.hasCalledGetter(io)) {
            @field(this, @tagName(io)).finalize();
        } else {
            @field(this, @tagName(io)).close();
        }
    }

    // This must only be run once per Subprocess
    pub fn finalizeStreams(this: *Subprocess) void {
        log("finalizeStreams", .{});
        this.closeProcess();

        this.closeIO(.stdin);
        this.closeIO(.stdout);
        this.closeIO(.stderr);

        close_stdio_pipes: {
            if (!this.observable_getters.contains(.stdio)) {
                break :close_stdio_pipes;
            }

            for (this.stdio_pipes.items) |pipe| {
                _ = bun.sys.close(pipe);
            }
            this.stdio_pipes.clearAndFree(bun.default_allocator);
        }

        this.exit_promise.deinit();
        this.on_exit_callback.deinit();
    }

    pub fn finalize(this: *Subprocess) callconv(.C) void {
        log("finalize", .{});
        // Ensure any code which references the "this" value doesn't attempt to
        // access it after it's been freed We cannot call any methods which
        // access GC'd values during the finalizer
        this.this_jsvalue = .zero;

        std.debug.assert(!this.hasPendingActivity() or JSC.VirtualMachine.get().isShuttingDown());
        this.finalizeStreams();

        this.process.detach();
        this.process.deref();
        bun.default_allocator.destroy(this);
    }

    pub fn getExited(
        this: *Subprocess,
        globalThis: *JSGlobalObject,
    ) callconv(.C) JSValue {
        switch (this.process.status) {
            .exited => |exit| {
                return JSC.JSPromise.resolvedPromiseValue(globalThis, JSValue.jsNumber(exit.code));
            },
            .signaled => |signal| {
                return JSC.JSPromise.resolvedPromiseValue(globalThis, JSValue.jsNumber(signal.toExitCode() orelse 254));
            },
            .err => |err| {
                return JSC.JSPromise.rejectedPromiseValue(globalThis, err.toJSC(globalThis));
            },
            else => {
                if (!this.exit_promise.has()) {
                    this.exit_promise.set(globalThis, JSC.JSPromise.create(globalThis).asValue(globalThis));
                }

                return this.exit_promise.get().?;
            },
        }
    }

    pub fn getExitCode(
        this: *Subprocess,
        _: *JSGlobalObject,
    ) callconv(.C) JSValue {
        if (this.process.status == .exited) {
            return JSC.JSValue.jsNumber(this.process.status.exited.code);
        }
        return JSC.JSValue.jsNull();
    }

    pub fn getSignalCode(
        this: *Subprocess,
        global: *JSGlobalObject,
    ) callconv(.C) JSValue {
        if (this.process.signalCode()) |signal| {
            if (signal.name()) |name|
                return JSC.ZigString.init(name).toValueGC(global)
            else
                return JSC.JSValue.jsNumber(@intFromEnum(signal));
        }

        return JSC.JSValue.jsNull();
    }

    pub fn spawn(globalThis: *JSC.JSGlobalObject, args: JSValue, secondaryArgsValue: ?JSValue) JSValue {
        return spawnMaybeSync(globalThis, args, secondaryArgsValue, false);
    }

    pub fn spawnSync(globalThis: *JSC.JSGlobalObject, args: JSValue, secondaryArgsValue: ?JSValue) JSValue {
        return spawnMaybeSync(globalThis, args, secondaryArgsValue, true);
    }

    pub fn spawnMaybeSync(
        globalThis: *JSC.JSGlobalObject,
        args_: JSValue,
        secondaryArgsValue: ?JSValue,
        comptime is_sync: bool,
    ) JSValue {
        bun.markPosixOnly();

        var arena = @import("root").bun.ArenaAllocator.init(bun.default_allocator);
        defer arena.deinit();
        var allocator = arena.allocator();

        var override_env = false;
        var env_array = std.ArrayListUnmanaged(?[*:0]const u8){
            .items = &.{},
            .capacity = 0,
        };
        var jsc_vm = globalThis.bunVM();

        var cwd = jsc_vm.bundler.fs.top_level_dir;

        var stdio = [3]Stdio{
            .{ .ignore = {} },
            .{ .pipe = {} },
            .{ .inherit = {} },
        };

        if (comptime is_sync) {
            stdio[1] = .{ .pipe = {} };
            stdio[2] = .{ .pipe = {} };
        }
        var lazy = false;
        var on_exit_callback = JSValue.zero;
        var PATH = jsc_vm.bundler.env.get("PATH") orelse "";
        var argv = std.ArrayList(?[*:0]const u8).init(allocator);
        var cmd_value = JSValue.zero;
        var detached = false;
        var args = args_;
        var ipc_mode = IPCMode.none;
        var ipc_callback: JSValue = .zero;
        var extra_fds = std.ArrayList(bun.spawn.SpawnOptions.Stdio).init(bun.default_allocator);
        var argv0: ?[*:0]const u8 = null;

        var windows_hide: bool = false;

        {
            if (args.isEmptyOrUndefinedOrNull()) {
                globalThis.throwInvalidArguments("cmd must be an array", .{});
                return .zero;
            }

            const args_type = args.jsType();
            if (args_type.isArray()) {
                cmd_value = args;
                args = secondaryArgsValue orelse JSValue.zero;
            } else if (!args.isObject()) {
                globalThis.throwInvalidArguments("cmd must be an array", .{});
                return .zero;
            } else if (args.getTruthy(globalThis, "cmd")) |cmd_value_| {
                cmd_value = cmd_value_;
            } else {
                globalThis.throwInvalidArguments("cmd must be an array", .{});
                return .zero;
            }

            if (args.isObject()) {
                if (args.getTruthy(globalThis, "argv0")) |argv0_| {
                    const argv0_str = argv0_.getZigString(globalThis);
                    if (argv0_str.len > 0) {
                        argv0 = argv0_str.toOwnedSliceZ(allocator) catch {
                            globalThis.throwOutOfMemory();
                            return .zero;
                        };
                    }
                }
            }

            {
                var cmds_array = cmd_value.arrayIterator(globalThis);
                argv = @TypeOf(argv).initCapacity(allocator, cmds_array.len) catch {
                    globalThis.throwOutOfMemory();
                    return .zero;
                };

                if (cmd_value.isEmptyOrUndefinedOrNull()) {
                    globalThis.throwInvalidArguments("cmd must be an array of strings", .{});
                    return .zero;
                }

                if (cmds_array.len == 0) {
                    globalThis.throwInvalidArguments("cmd must not be empty", .{});
                    return .zero;
                }

                {
                    var first_cmd = cmds_array.next().?;
                    var arg0 = first_cmd.toSlice(globalThis, allocator);
                    defer arg0.deinit();

                    if (argv0 == null) {
                        var path_buf: [bun.MAX_PATH_BYTES]u8 = undefined;
                        const resolved = Which.which(&path_buf, PATH, cwd, arg0.slice()) orelse {
                            globalThis.throwInvalidArguments("Executable not found in $PATH: \"{s}\"", .{arg0.slice()});
                            return .zero;
                        };
                        argv0 = allocator.dupeZ(u8, resolved) catch {
                            globalThis.throwOutOfMemory();
                            return .zero;
                        };
                    } else {
                        var path_buf: [bun.MAX_PATH_BYTES]u8 = undefined;
                        const resolved = Which.which(&path_buf, PATH, cwd, bun.sliceTo(argv0.?, 0)) orelse {
                            globalThis.throwInvalidArguments("Executable not found in $PATH: \"{s}\"", .{arg0.slice()});
                            return .zero;
                        };
                        argv0 = allocator.dupeZ(u8, resolved) catch {
                            globalThis.throwOutOfMemory();
                            return .zero;
                        };
                    }
                    argv.appendAssumeCapacity(allocator.dupeZ(u8, arg0.slice()) catch {
                        globalThis.throwOutOfMemory();
                        return .zero;
                    });
                }

                while (cmds_array.next()) |value| {
                    const arg = value.getZigString(globalThis);

                    // if the string is empty, ignore it, don't add it to the argv
                    if (arg.len == 0) {
                        continue;
                    }

                    argv.appendAssumeCapacity(arg.toOwnedSliceZ(allocator) catch {
                        globalThis.throwOutOfMemory();
                        return .zero;
                    });
                }

                if (argv.items.len == 0) {
                    globalThis.throwInvalidArguments("cmd must be an array of strings", .{});
                    return .zero;
                }
            }

            if (args != .zero and args.isObject()) {

                // This must run before the stdio parsing happens
                if (args.getTruthy(globalThis, "ipc")) |val| {
                    if (Environment.isWindows) {
                        globalThis.throwTODO("TODO: IPC is not yet supported on Windows");
                        return .zero;
                    }

                    if (val.isCell() and val.isCallable(globalThis.vm())) {
                        // In the future, we should add a way to use a different IPC serialization format, specifically `json`.
                        // but the only use case this has is doing interop with node.js IPC and other programs.
                        ipc_mode = .bun;
                        ipc_callback = val.withAsyncContextIfNeeded(globalThis);
                        extra_fds.append(.{ .buffer = {} }) catch {
                            globalThis.throwOutOfMemory();
                            return .zero;
                        };
                    }
                }

                if (args.getTruthy(globalThis, "cwd")) |cwd_| {
                    const cwd_str = cwd_.getZigString(globalThis);
                    if (cwd_str.len > 0) {
                        cwd = cwd_str.toOwnedSliceZ(allocator) catch {
                            globalThis.throwOutOfMemory();
                            return .zero;
                        };
                    }
                }

                if (args.getTruthy(globalThis, "onExit")) |onExit_| {
                    if (!onExit_.isCell() or !onExit_.isCallable(globalThis.vm())) {
                        globalThis.throwInvalidArguments("onExit must be a function or undefined", .{});
                        return .zero;
                    }

                    on_exit_callback = if (comptime is_sync)
                        onExit_
                    else
                        onExit_.withAsyncContextIfNeeded(globalThis);
                }

                if (args.getTruthy(globalThis, "env")) |object| {
                    if (!object.isObject()) {
                        globalThis.throwInvalidArguments("env must be an object", .{});
                        return .zero;
                    }

                    override_env = true;
                    var object_iter = JSC.JSPropertyIterator(.{
                        .skip_empty_name = false,
                        .include_value = true,
                    }).init(globalThis, object.asObjectRef());
                    defer object_iter.deinit();
                    env_array.ensureTotalCapacityPrecise(allocator, object_iter.len) catch {
                        globalThis.throwOutOfMemory();
                        return .zero;
                    };

                    // If the env object does not include a $PATH, it must disable path lookup for argv[0]
                    PATH = "";

                    while (object_iter.next()) |key| {
                        var value = object_iter.value;
                        if (value == .undefined) continue;

                        var line = std.fmt.allocPrintZ(allocator, "{}={}", .{ key, value.getZigString(globalThis) }) catch {
                            globalThis.throwOutOfMemory();
                            return .zero;
                        };

                        if (key.eqlComptime("PATH")) {
                            PATH = bun.asByteSlice(line["PATH=".len..]);
                        }

                        env_array.append(allocator, line) catch {
                            globalThis.throwOutOfMemory();
                            return .zero;
                        };
                    }
                }

                if (args.get(globalThis, "stdio")) |stdio_val| {
                    if (!stdio_val.isEmptyOrUndefinedOrNull()) {
                        if (stdio_val.jsType().isArray()) {
                            var stdio_iter = stdio_val.arrayIterator(globalThis);
                            var i: u32 = 0;
                            while (stdio_iter.next()) |value| : (i += 1) {
                                if (!stdio[i].extract(globalThis, i, value))
                                    return JSC.JSValue.jsUndefined();
                                if (i == 2)
                                    break;
                            }
                            i += 1;

                            while (stdio_iter.next()) |value| : (i += 1) {
                                var new_item: Stdio = undefined;
                                if (!new_item.extract(globalThis, i, value)) {
                                    return JSC.JSValue.jsUndefined();
                                switch (new_item) {
                                    .pipe => {
                                        extra_fds.append(.{ .buffer = {} }) catch {
                                            globalThis.throwOutOfMemory();
                                            return .zero;
                                        };
                                    },
                                    else => {
                                        // TODO: fix leak
                                    },
                                }

                                extra_fds.append(new_item.asSpawnOption()) catch {
                                    globalThis.throwOutOfMemory();
                                    return .zero;
                                };
                            }
                        } else {
                            globalThis.throwInvalidArguments("stdio must be an array", .{});
                            return .zero;
                        }
                    }
                } else {
                    if (args.get(globalThis, "stdin")) |value| {
                        if (!stdio[0].extract(globalThis, 0, value))
                            return .zero;
                    }

                    if (args.get(globalThis, "stderr")) |value| {
                        if (!stdio[2].extract(globalThis, 2, value))
                            return .zero;
                    }

                    if (args.get(globalThis, "stdout")) |value| {
                        if (!stdio[1].extract(globalThis, 1, value))
                            return .zero;
                    }
                }

                if (comptime !is_sync) {
                    if (args.get(globalThis, "lazy")) |lazy_val| {
                        if (lazy_val.isBoolean()) {
                            lazy = lazy_val.toBoolean();
                        }
                    }
                }

                if (args.get(globalThis, "detached")) |detached_val| {
                    if (detached_val.isBoolean()) {
                        detached = detached_val.toBoolean();
                    }
                }

                if (Environment.isWindows) {
                    if (args.get(globalThis, "windowsHide")) |val| {
                        if (val.isBoolean()) {
                            windows_hide = @intFromBool(val.asBoolean());
                        }
                    }
                }
            }
        }

        if (!override_env and env_array.items.len == 0) {
            env_array.items = jsc_vm.bundler.env.map.createNullDelimitedEnvMap(allocator) catch |err| return globalThis.handleError(err, "in posix_spawn");
            env_array.capacity = env_array.items.len;
        }

        inline for (0..stdio.len) |fd_index| {
            if (stdio[fd_index].canUseMemfd(is_sync)) {
                stdio[fd_index].useMemfd(fd_index);
            }
        }
        var should_close_memfd = Environment.isLinux;

        defer {
            if (should_close_memfd) {
                inline for (0..stdio.len) |fd_index| {
                    if (stdio[fd_index] == .memfd) {
                        _ = bun.sys.close(stdio[fd_index].memfd);
                        stdio[fd_index] = .ignore;
                    }
                }
            }
        }

        // IPC is currently implemented in a very limited way.
        //
        // Node lets you pass as many fds as you want, they all become be sockets; then, IPC is just a special
        // runtime-owned version of "pipe" (in which pipe is a misleading name since they're bidirectional sockets).
        //
        // Bun currently only supports three fds: stdin, stdout, and stderr, which are all unidirectional
        //
        // And then fd 3 is assigned specifically and only for IPC. This is quite lame, because Node.js allows
        // the ipc fd to be any number and it just works. But most people only care about the default `.fork()`
        // behavior, where this workaround suffices.
        //
        // When Bun.spawn() is given an `.ipc` callback, it enables IPC as follows:
        var socket: IPC.Socket = undefined;
        if (ipc_mode != .none) {
            if (comptime is_sync) {
                globalThis.throwInvalidArguments("IPC is not supported in Bun.spawnSync", .{});
                return .zero;
            }

            env_array.ensureUnusedCapacity(allocator, 2) catch |err| return globalThis.handleError(err, "in posix_spawn");
            env_array.appendAssumeCapacity("BUN_INTERNAL_IPC_FD=3");
        }

        env_array.append(allocator, null) catch {
            globalThis.throwOutOfMemory();
            return .zero;
        };
        argv.append(null) catch {
            globalThis.throwOutOfMemory();
            return .zero;
        };

        if (comptime is_sync) {
            for (&stdio, 0..) |*io, i| {
                io.toSync(@truncate(i));
            }
        }

        const spawn_options = bun.spawn.SpawnOptions{
            .cwd = cwd,
            .detached = detached,
            .stdin = stdio[0].asSpawnOption(),
            .stdout = stdio[1].asSpawnOption(),
            .stderr = stdio[2].asSpawnOption(),
            .extra_fds = extra_fds.items,
            .argv0 = argv0,

            .windows = if (Environment.isWindows) bun.spawn.WindowsSpawnOptions.WindowsOptions{
                .hide_window = windows_hide,
                .loop = jsc_vm.eventLoop().uws_loop,
            } else {},
        };

        var spawned = switch (bun.spawn.spawnProcess(
            &spawn_options,
            @ptrCast(argv.items.ptr),
            @ptrCast(env_array.items.ptr),
        ) catch |err| {
            globalThis.throwError(err, ": failed to spawn process");

            return .zero;
        }) {
            .err => |err| {
                globalThis.throwValue(err.toJSC(globalThis));
                return .zero;
            },
            .result => |result| result,
        };

        if (ipc_mode != .none) {
            socket = .{
                // we initialize ext later in the function
                .socket = uws.us_socket_from_fd(
                    jsc_vm.rareData().spawnIPCContext(jsc_vm),
                    @sizeOf(*Subprocess),
                    spawned.extra_pipes.items[0].cast(),
                ) orelse {
                    globalThis.throw("failed to create socket pair", .{});
                    // TODO:
                    return .zero;
                },
            };
        }

        var subprocess = globalThis.allocator().create(Subprocess) catch {
            globalThis.throwOutOfMemory();
            return .zero;
        };

        const loop = jsc_vm.eventLoop();

        // When run synchronously, subprocess isn't garbage collected
        subprocess.* = Subprocess{
            .globalThis = globalThis,
            .process = spawned.toProcess(
                loop,
                is_sync,
            ),
            .pid_rusage = null,
            .stdin = Writable.init(
                stdio[0],
                loop,
                subprocess,
                spawned.stdin,
            ) catch {
                globalThis.throwOutOfMemory();
                return .zero;
            },
            .stdout = Readable.init(
                stdio[1],
                loop,
                subprocess,
                spawned.stdout,
                jsc_vm.allocator,
                default_max_buffer_size,
                is_sync,
            ),
            .stderr = Readable.init(
                stdio[2],
                loop,
                subprocess,
                spawned.stderr,
                jsc_vm.allocator,
                default_max_buffer_size,
                is_sync,
            ),
            .stdio_pipes = spawned.extra_pipes.moveToUnmanaged(),
            .on_exit_callback = if (on_exit_callback != .zero) JSC.Strong.create(on_exit_callback, globalThis) else .{},
            .ipc_mode = ipc_mode,
            // will be assigned in the block below
            .ipc = .{ .socket = socket },
            .ipc_callback = if (ipc_callback != .zero) JSC.Strong.create(ipc_callback, globalThis) else undefined,
            .flags = .{
                .is_sync = is_sync,
            },
        };
        subprocess.process.setExitHandler(subprocess);

        if (ipc_mode != .none) {
            const ptr = socket.ext(*Subprocess);
            ptr.?.* = subprocess;
            subprocess.ipc.writeVersionPacket();
        }

        if (subprocess.stdin == .pipe) {
            subprocess.stdin.pipe.signal = JSC.WebCore.Signal.init(&subprocess.stdin);
        }

        const out = if (comptime !is_sync)
            subprocess.toJS(globalThis)
        else
            JSValue.zero;
        subprocess.this_jsvalue = out;

        var send_exit_notification = false;

        if (comptime !is_sync) {
            switch (subprocess.process.watch(jsc_vm)) {
                .result => {},
                .err => {
                    send_exit_notification = true;
                    lazy = false;
                },
            }
        }

        defer {
            if (send_exit_notification) {
                // process has already exited
                // https://cs.github.com/libuv/libuv/blob/b00d1bd225b602570baee82a6152eaa823a84fa6/src/unix/process.c#L1007
                subprocess.process.wait(is_sync);
            }
        }

        if (subprocess.stdin == .buffer) {
            subprocess.stdin.buffer.start().assert();
        }

        if (subprocess.stdout == .pipe) {
            subprocess.stdout.pipe.start(subprocess, loop).assert();
            if ((is_sync or !lazy) and subprocess.stdout == .pipe) {
                subprocess.stdout.pipe.readAll();
            }
        }

        if (subprocess.stderr == .pipe) {
            subprocess.stderr.pipe.start(subprocess, loop).assert();

            if ((is_sync or !lazy) and subprocess.stderr == .pipe) {
                subprocess.stderr.pipe.readAll();
            }
        }

        should_close_memfd = false;

        if (comptime !is_sync) {
            return out;
        }

        if (comptime is_sync) {
            switch (subprocess.process.watch(jsc_vm)) {
                .result => {},
                .err => {
                    subprocess.process.wait(true);
                },
            }
        }

        while (subprocess.hasPendingActivityNonThreadsafe()) {
            if (subprocess.stdin == .buffer) {
                subprocess.stdin.buffer.watch();
            }

            if (subprocess.stderr == .pipe) {
                subprocess.stderr.pipe.watch();
            }

            if (subprocess.stdout == .pipe) {
                subprocess.stdout.pipe.watch();
            }

            jsc_vm.tick();
            jsc_vm.eventLoop().autoTick();
        }

        subprocess.updateHasPendingActivity();

        const exitCode = subprocess.getExitCode(globalThis);
        const stdout = subprocess.stdout.toBufferedValue(globalThis);
        const stderr = subprocess.stderr.toBufferedValue(globalThis);
        const resource_usage = subprocess.createResourceUsageObject(globalThis);
        subprocess.finalize();

        const sync_value = JSC.JSValue.createEmptyObject(globalThis, 5);
        sync_value.put(globalThis, JSC.ZigString.static("exitCode"), exitCode);
        sync_value.put(globalThis, JSC.ZigString.static("stdout"), stdout);
        sync_value.put(globalThis, JSC.ZigString.static("stderr"), stderr);
        sync_value.put(globalThis, JSC.ZigString.static("success"), JSValue.jsBoolean(exitCode.isInt32() and exitCode.asInt32() == 0));
        sync_value.put(globalThis, JSC.ZigString.static("resourceUsage"), resource_usage);

        return sync_value;
    }

    const os = std.os;

    pub fn handleIPCMessage(
        this: *Subprocess,
        message: IPC.DecodedIPCMessage,
    ) void {
        switch (message) {
            // In future versions we can read this in order to detect version mismatches,
            // or disable future optimizations if the subprocess is old.
            .version => |v| {
                IPC.log("Child IPC version is {d}", .{v});
            },
            .data => |data| {
                IPC.log("Received IPC message from child", .{});
                if (this.ipc_callback.get()) |cb| {
                    this.globalThis.bunVM().eventLoop().runCallback(
                        cb,
                        this.globalThis,
                        this.this_jsvalue,
                        &[_]JSValue{ data, this.this_jsvalue },
                    );
                }
            },
        }
    }

    pub fn handleIPCClose(this: *Subprocess, _: IPC.Socket) void {
        // uSocket is already freed so calling .close() on the socket can segfault
        this.ipc_mode = .none;
        this.updateHasPendingActivity();
    }

    pub const IPCHandler = IPC.NewIPCHandler(Subprocess);
};
