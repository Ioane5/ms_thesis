const path = require('path');

module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, '../'),
        filename: 'dataController.js',
        library: 'DataController',
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    // externals: {
    //     'socket.io-client': {
    //         commonjs: 'socket.io-client',
    //         commonjs2: 'socket.io-client',
    //         amd: 'socket.io-client',
    //         root: 'io'
    //     }
    // },
    module: {
        rules: [
            {test: /\.js$/, exclude: /node_modules/, loader: "babel-loader"}
        ]
    },
};