<?php

// Auth
$authUser = !empty($_SERVER['COMMAND_LAUNCHER_USER']) ? $_SERVER['COMMAND_LAUNCHER_USER'] : 'admin';
$authPass = !empty($_SERVER['COMMAND_LAUNCHER_PASS']) ? $_SERVER['COMMAND_LAUNCHER_PASS'] : 's@KLx95YT#B4yZ';
header('Cache-Control: no-cache, must-revalidate, max-age=0');
$hasCredentials = !(empty($_SERVER['PHP_AUTH_USER']) && empty($_SERVER['PHP_AUTH_PW']));
$isNotAuthenticated = (!$hasCredentials || $_SERVER['PHP_AUTH_USER'] != $authUser || $_SERVER['PHP_AUTH_PW'] != $authPass) && (!empty($_SERVER['PHYSICAL_ENV']) && 'dev' !== $_SERVER['PHYSICAL_ENV']);
if ($isNotAuthenticated) {
    header('HTTP/1.1 401 Authorization Required');
    header('WWW-Authenticate: Basic realm="Access denied"');
    exit;
}

$logDir = !empty($_SERVER['COMMAND_LAUNCHER_LOG_DIR']) ? $_SERVER['COMMAND_LAUNCHER_LOG_DIR'] : '/var/www/scripts/logs/';
@mkdir($logDir, 0777, true);
if (isset($_GET['log']) && preg_match('/^log-command-[0-9]+-[0-9]+-[0-9]+.log$/', $_GET['log'])) {
    header('Cache-Control: no-cache');
    header('Content-Type: text/plain');
    if ($handle = fopen($logDir.$_GET['log'], 'r')) {
        while (!feof($handle)) {
            echo preg_replace('#\\x1b[[][^A-Za-z]*[A-Za-z]#', '', fgets($handle));
        }
        fclose($handle);
    }
    die();
}

// Apps config
$apps = [];
require_once(__DIR__.'/../config/command_launcher/apps_config.php');

// Kill
if (!empty($_POST['kill'])) {
    $pid = (int) $_POST['kill'];
    $files = scandir($logDir);
    natsort($files);

    foreach ($files as $file) {
        $matches = [];
        if (preg_match('/^log-command-[0-9]+-[0-9]+-([0-9]+).log$/', $file, $matches) && $pid == $matches[1]) {
            $running = file_exists('/proc/'.$matches[1]);
            if ($running) {
                foreach(preg_split('/\s+/', `ps -o pid --no-heading --ppid $pid`) as $childPid) {
                    if(is_numeric($childPid)) {
                        `kill -s KILL $childPid &`;
                    }
                }
                `wait`;
            }
            exit(0);
        }
    }
    exit(2);
}

// Execute
if (!empty($_POST['app'])) {
    ignore_user_abort(true);
    ob_implicit_flush(true);
    ob_end_clean();
    set_time_limit(0);
    ini_set('memory_limit', '-1');

    header('X-Accel-Buffering: no');
    header('Cache-Control: no-cache');
    header('Content-Type: text/event-stream');

    if (!isset($apps[$_POST['app']])) {
        die('Non existant app '.$_POST['app']);
    }
    $app = $apps[$_POST['app']];

    // Use current env vars (code from Symfony\Component\Process\Process::getDefaultEnv)
    $env = [];
    foreach ($_SERVER as $k => $v) {
        if (\is_string($v) && false !== $v = getenv($k)) {
            $env[$k] = $v;
        }
    }
    foreach ($_ENV as $k => $v) {
        if (\is_string($v)) {
            $env[$k] = $v;
        }
    }

    // Format command
    $command = $_POST['command'];
    if (isset($app['formatter'])) {
        $command = $app['formatter']($command);
    }

    // Start process
    $start = time();
    $pipesDescr = array(
        0 => array("pipe", "r"),
        1 => array("pipe", "w"),
        2 => array("pipe", "w"),
    );
    $process = proc_open($app['exec'].' '.$command, $pipesDescr, $pipes, $app['cwd'], $env);
    if (!is_resource($process)) {
        die('Process open error');
    }

    $processStats = proc_get_status($process);
    header('X-Pid: '. $processStats['pid']);

    $logs = fopen($logDir.'log-command-'.date('Ymd-His').'-'.$processStats['pid'].'.log', 'w');
    $log = '['.date('H:i:s').' (0s)] Start execution : '.$command.PHP_EOL;
    echo $log;
    if (!empty(ob_get_contents())) {
        ob_flush();
    }
    fwrite($logs, $log);

    stream_set_blocking($pipes[1], 0);
    stream_set_blocking($pipes[2], 0);
    $wait = 0;
    while (1) {
        if (feof($pipes[1]) && feof($pipes[2])) {
            break;
        }

        $duration='['.date('H:i:s').' ('.(time()-$start).'s)]';

        $data = fgets($pipes[1]);
        if ($data) {
            $log = $duration.' '.$data;
            echo preg_replace('#\\x1b[[][^A-Za-z]*[A-Za-z]#', '', $log);
            fwrite($logs, $log);
            $wait=0;
        }
        $dataErr = fgets($pipes[2]);
        if ($dataErr) {
            $log = $duration.' '.$dataErr;
            echo preg_replace('#\\x1b[[][^A-Za-z]*[A-Za-z]#', '', $log);
            fwrite($logs, $log);
            $wait=0;
        }
        if (!$data && !$dataErr) {
            usleep(0.5 * 1000000);
            $wait++;
            if ($wait % 100 === 0) {
                echo $duration.' Dummy log to keep alive connection'.PHP_EOL;
            }
        }
        if (!empty(ob_get_contents())) {
            ob_flush();
        }
    }
    fclose($pipes[0]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exitCode = proc_close($process);

    $log = '['.date('H:i:s').' ('.(time() - $start).'s)] End execution';
    $log .= "\nExit code of the command: ".$exitCode;
    echo $log;
    fwrite($logs, $log);
    fclose($logs);

    exit(0);
}

?>
<html>
<head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css">
    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.bundle.min.js"></script>
</head>
<body>
<div class="container">
    <h1>Command launcher</h1>
    <form method="post">
        <div class="form-group row">
            <label for="app" class="col-sm-2 col-form-label">Application</label>
            <div class="col-sm-10">
                <select id="app" name="app" class="form-control">
                    <?php
                    foreach ($apps as $v => $app) {
                        printf(
                            '<option value="%s" data-help="%s" %s>%s</option>',
                            $v,
                            htmlentities($app['help']),
                            (@$_POST['app'] == $v ? 'selected' : ''),
                            $app['label']
                        );
                    }
                    ?>
                </select>
            </div>
        </div>
        <div class="form-group row">
            <label for="command" class="col-sm-2 col-form-label">Commande</label>
            <div class="col-sm-10">
                <textarea id="command" name="command" class="form-control" rows="3"><?php echo htmlspecialchars($_POST['command'] ?? '') ?></textarea>
                <small id="command_help" class="form-text text-muted"></small>
            </div>
        </div>
        <div class="form-group">
            <button type="submit" id="execute" class="btn btn-primary">🚀 Exécuter</button>
            <button type="button" id="kill" class="btn btn-danger">🛑 Arrêter</button>
        </div>
    </form>
    <hr/>
    <div>
        <h2>Sortie</h2>
        <div id="result"><p><em>En attente exécution commande</em></p></div>
        <div id="loading"><img src="./loader.gif" width="64"></div>
    </div>
    <hr/>
    <div>
        <h2>Logs précédents</h2>
        <div id="logs">
            <?php
            // Logs
            $logs = '';
            $files = scandir($logDir);
            natsort($files);
            foreach ($files as $file) {
                $matches = [];
                if (preg_match('/^log-command-[0-9]+-[0-9]+-([0-9]+).log$/', $file, $matches)) {
                    $running = file_exists('/proc/'.$matches[1]);
                    $logs .= '<div><a target="_blank" href="?log='.$file.'">'.$file.'</a>'.($running?' <span data-run="kill" data-pid="'.$matches[1].'">Exécution en cours ... <button type="button">🛑</button></span>':'').'</div>';
                    $firstLogLine = fgets(fopen($logDir.$file, 'r'));
                    $logs .= '<div style="margin:0 0 15px 15px; font-size:10pt;"><i>'.$firstLogLine.'</i></div>';
                }
            }
            if (!$logs) {
                echo 'Aucun log';
            } else {
                echo 'Chaque fichier correspond à une execution d\'une commande.<br>';
                echo 'Si pour une raison quelconque, la connection est perdue pendant l\'execution, rafraichir la page fera apparaitre le fichier de log correspondant et on pourra continuer à suivre l\'execution en rafraichissant constamment le fichier de log.<br>';
                echo 'Tant que la commande est en cours, le nom du fichier sera suivi de "(running)".<br><br>';
                echo $logs;
            }
            ?>
        </div>
    </div>
</div>
<script type="text/javascript">
    function kill(pid, callback) {
        const formData = new FormData();
        formData.append('kill', pid);

        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = callback(xhr);
        xhr.open('POST', '');
        xhr.send(formData);
    };

    $('#logs').on('click', '[data-run=kill]', function () {
        let $this = $(this);
        $this.find('button').prop('disabled', true);

        let uiCallback = (xhr) => {
            return () => {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    $this.hide();
                }
            };
        };
        kill($this.data('pid'), uiCallback);
    });

    $('#app').change(function (e) {
        $('#command_help').html($(this).find('option:selected').data('help'));
    }).change();

    $('#kill')
        .prop('disabled', true)
        .css('display', 'none')
        .on('click',function () {
            let $this = $(this);
            $this.prop('disabled', true);

            let uiCallback = (xhr) => {
                return () => {
                    if (xhr.readyState === XMLHttpRequest.DONE) {
                        $this
                            .removeData('pid')
                            .hide();
                        $('#execute')
                            .prop('disabled', false)
                            .show();
                    }
                };
            };
            kill($this.data('pid'), uiCallback);
        });

    $('#loading').hide();

    $('form').submit(function (event) {
        event.preventDefault();

        $('#execute').prop('disabled', true);
        $('#loading').show();

        var req = new XMLHttpRequest();
        req.addEventListener('progress', function (e) {
            $('#result').html(this.response.replace(/(?:\r\n|\r|\n)/g, "<br/>", "g"));
        }, false);
        req.addEventListener('load', function (e) {
            $('#result').html(this.response.replace(/(?:\r\n|\r|\n)/g, "<br/>", "g"));
        }, false);
        req.addEventListener('error', function (e) {
            var data = this.response.replace(/(?:\r\n|\r|\n)/g, "<br/>", "g");
            if (data) {
                $('#result').html('Erreur : ' + data);
            } else {
                $('#result').append('Erreur : ' + data);
            }
            $('#loading').hide();
        }, false);
        req.addEventListener('readystatechange', function (e) {
            if (req.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
                $('#execute').hide();
                $('#kill')
                    .data('pid', req.getResponseHeader('X-Pid'))
                    .prop('disabled', false)
                    .show();
            }

            if (req.readyState === XMLHttpRequest.DONE) {
                $('#kill')
                    .prop('disabled', true)
                    .hide();
                $('#execute')
                    .prop('disabled', false)
                    .show();
                $('#loading').hide();
            }
        }, false);
        req.open('POST', '');
        req.send(new FormData(document.querySelector('form')));
    });
</script>
</body>
</html>
