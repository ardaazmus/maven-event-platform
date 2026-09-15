<?php
if (!defined('ABSPATH')) exit;
$slug = isset($attributes['slug']) ? sanitize_text_field($attributes['slug']) : '';
$mode = isset($attributes['mode']) ? sanitize_text_field($attributes['mode']) : 'iframe';
echo mavenforms_render(['id'=>$slug,'mode'=>$mode]);
