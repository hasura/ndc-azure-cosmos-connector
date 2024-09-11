import { exec, execSync } from 'child_process';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findVacantPort(startPort = 8000) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        findVacantPort(startPort + 1).then(resolve, reject);
      } else {
        reject(err);
      }
    });
  });
}

async function runTests() {
  const projectRoot = path.resolve(__dirname, '..');
  const logFile = path.join(projectRoot, 'server-output.log');
  let serverProcess = null;

  try {
    const port = await findVacantPort();
    console.log(`Found vacant port: ${port}`);

    const startCommand = `npm run start serve -- --configuration . --port ${port} | jq -R -r '. as $line | try fromjson catch $line'`;
      const testCommand = `ndc-test replay --endpoint http://0.0.0.0:${port} --snapshots-dir ${path.join(projectRoot, 'ndc-test-snapshots')}`;

    console.log('Starting server...');
    serverProcess = exec(startCommand, { cwd: projectRoot });

    // Save server output to file
    const logStream = fs.createWriteStream(logFile);
    serverProcess.stdout.pipe(logStream);
    serverProcess.stderr.pipe(logStream);

    // Wait for server to start (adjust timeout as needed)
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Running tests...');
    execSync(testCommand, { stdio: 'inherit', cwd: projectRoot });

    console.log('Tests completed successfully.');
  } catch (error) {
    console.error('An error occurred:', error);

    // Output contents of log file
    console.error('Server output:');
    try {
      const logContents = fs.readFileSync(logFile, 'utf8');
      console.error(logContents);
    } catch (readError) {
      console.error('Failed to read server output log:', readError);
    }
  } finally {
    // Terminate the server process
    if (serverProcess) {
      console.log('Terminating server process...');
      serverProcess.kill('SIGTERM');
    }

    // Clean up log file
    try {
      fs.unlinkSync(logFile);
    } catch (unlinkError) {
      console.error('Failed to remove log file:', unlinkError);
    }

    console.log('Test setup script completed.');
  }
}

runTests().then(() => process.exit(0)).catch(() => process.exit(1));
