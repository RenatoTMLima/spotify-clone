import server from './server.js'

server.listen(3000)
.on('listening', () => console.log('server running on port 3000'))