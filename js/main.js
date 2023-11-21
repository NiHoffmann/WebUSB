requirejs.config({
    baseUrl: 'js',
    paths: {
        dapjs: 'libs/dapjs/dap.umd',
        webUsb: 'webUsb'
    }
});

// Start loading the main app file. Put all of
// your application logic in there.
requirejs(['dapjs', 'webUsb']);
