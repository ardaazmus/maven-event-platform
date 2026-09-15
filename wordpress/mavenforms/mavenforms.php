<?php
/**
 * Plugin Name: MavenForms
 * Description: Embed MavenForms public forms via Gutenberg block or shortcode. Uses sanitized PublicFormSnapshot only.
 * Version: 0.1.0
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */
if (!defined('ABSPATH')) exit;

define('MAVENFORMS_VERSION','0.1.0');
define('MAVENFORMS_DEFAULT_BASE', 'https://example.com'); // ponytail: configure via Settings > MavenForms

function mavenforms_sanitize_attrs($atts){
  $a = shortcode_atts(['id'=>'','slug'=>'','mode'=>'iframe','width'=>'100%','height'=>'600'], $atts, 'mavenforms_form');
  $id = sanitize_text_field($a['id'] ?: $a['slug']);
  $mode = in_array($a['mode'], ['iframe','inline'], true) ? $a['mode'] : 'iframe';
  $width = sanitize_text_field($a['width']);
  $height = intval($a['height']) ?: 600;
  return compact('id','mode','width','height');
}

function mavenforms_render($atts){
  $a = mavenforms_sanitize_attrs($atts);
  if (empty($a['id'])) return '<!-- mavenforms: missing id/slug -->';
  $baseRaw = get_option('mavenforms_base_url', '');
  if (empty($baseRaw)) return '<!-- mavenforms: base URL not configured (Settings > MavenForms) -->';
  $base = esc_url($baseRaw);
  if (empty($base) || !preg_match('#^https://#', $base)) return '<!-- mavenforms: base URL must be https -->';
  $slug = esc_attr($a['id']);
  $title = esc_attr('MavenForms: '.$slug);
  if ($a['mode']==='inline'){
    $src = $base . '/api/forms/' . rawurlencode($slug) . '/embed-script';
    return '<mavenforms-form data-slug="'. $slug .'"></mavenforms-form><script src="'. esc_url($src) .'" async></script>';
  }
  $src = $base . '/forms/' . rawurlencode($slug);
  return '<iframe src="'. esc_url($src) .'" title="'. $title .'" width="'. esc_attr($a['width']) .'" height="'. esc_attr((string)$a['height']) .'" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" style="border:0;width:100%;max-width:100%"></iframe>';
}
// Keep the documented shortcode as the canonical name and retain the original
// name so existing posts do not break during the migration.
add_shortcode('mavenforms', 'mavenforms_render');
add_shortcode('mavenforms_form', 'mavenforms_render');

function mavenforms_block_init(){
  if (!function_exists('register_block_type')) return;
  register_block_type(__DIR__ . '/block.json');
}
add_action('init','mavenforms_block_init');

function mavenforms_settings(){
  add_options_page('MavenForms','MavenForms','manage_options','mavenforms', function(){
    if (isset($_POST['mavenforms_base_url']) && check_admin_referer('mavenforms_save')){
      update_option('mavenforms_base_url', esc_url_raw($_POST['mavenforms_base_url']));
      echo '<div class="updated"><p>Kaydedildi</p></div>';
    }
    $base = esc_attr(get_option('mavenforms_base_url', MAVENFORMS_DEFAULT_BASE));
    echo '<div class="wrap"><h1>MavenForms</h1><form method="post">'.wp_nonce_field('mavenforms_save','',true,false).'<table class="form-table"><tr><th>Base URL</th><td><input type="url" name="mavenforms_base_url" value="'.$base.'" class="regular-text" /></td></tr></table><p><button class="button button-primary">Kaydet</button></p></form></div>';
  });
}
add_action('admin_menu','mavenforms_settings');
