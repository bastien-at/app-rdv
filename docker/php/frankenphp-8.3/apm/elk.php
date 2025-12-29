<?php
/**
 * Ajouter dans index.php
 * \Elastic\Apm\Impl\AutoInstrument\PhpPartFacade::bootstrap(0, microtime(true)*1000000);
 * \Elastic\Apm\Impl\AutoInstrument\PhpPartFacade::shutdown();
 *
 * Désactiver les extension_loaded dans apminteractor
 * ElasticApmExtensionUtil.php : changer pour avoir tjs self::$isLoaded = true;
 */


define('ELASTIC_APM_LOG_LEVEL_TRACE', 0);
define('ELASTIC_APM_LOG_LEVEL_DEBUG', 100);  // => chercher les bonnes valeurs
define('ELASTIC_APM_LOG_LEVEL_WARNING', 100);
define('ELASTIC_APM_LOG_LEVEL_CRITICAL', 100);
const ELASTIC_APM_WORDPRESS_DIRECT_CALL_METHOD_SET_READY_TO_WRAP_FILTER_CALLBACKS = 0;
function elastic_apm_log() {}
function elastic_apm_before_loading_agent_php_code(){}
function elastic_apm_after_loading_agent_php_code(){}
function elastic_apm_is_enabled() {return true;}
function elastic_apm_send_to_server($ua, $serialized) {
    $url = 'http://elastic-apm-server:8220/intake/v2/events';
    $body = $serialized;
    $ch = curl_init($url);
    if (false === $ch) {
        throw new \Exception('init error');
    }
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/x-ndjson',
        'Content-length: ' . strlen($body),
        'User-Agent: ' . $ua
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);

    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    //var_dump("r", $code, $response);

}

require_once "/opt/elastic/apm-agent-php/src/bootstrap_php_part.php";