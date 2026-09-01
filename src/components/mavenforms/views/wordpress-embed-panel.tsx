'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  Code2,
  Copy,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe,
  Smartphone,
  ShieldCheck,
  Info,
  FileCode,
  Puzzle,
} from 'lucide-react'
import type { FormDetail } from '@/lib/types'

interface WordPressEmbedPanelProps {
  form: FormDetail
}

export function WordPressEmbedPanel({ form }: WordPressEmbedPanelProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const { toast } = useToast()

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const formUrl = `${origin}/forms/${form.slug}`
  const embedScriptUrl = `${origin}/api/forms/${form.id}/embed-script?slug=${form.slug}`
  const iframeCode = `<iframe src="${formUrl}?embed=1" width="100%" height="600" frameborder="0" title="${form.title}" loading="lazy" sandbox="allow-scripts allow-forms allow-same-origin allow-popups"></iframe>`
  const jsEmbedCode = `<!-- MavenForms Embed -->
<div data-mavenforms="${form.slug}" data-height="600"></div>
<script src="${embedScriptUrl}" async></script>`
  const wpShortcode = `[mavenforms id="${form.slug}"]`
  const directUrl = formUrl

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    toast({ title: 'Kopyalandı!', description: 'Panoya kopyalandı' })
    setTimeout(() => setCopied(null), 2000)
  }

  const downloadPlugin = () => {
    const php = generateWordPressPlugin()
    const blob = new Blob([php], { type: 'application/x-php' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mavenforms-${form.slug}.php`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Plugin indirildi', description: 'mavenforms-' + form.slug + '.php' })
  }

  const generateWordPressPlugin = () => {
    return `<?php
/**
 * Plugin Name: MavenForms Embed - ${form.title}
 * Description: ${form.slug} formunu WordPress'e gömer
 * Version: 1.0.0
 * Author: MavenForms
 */

if (!defined('ABSPATH')) exit;

class MavenForms_Embed {

    private $form_slug = '${form.slug}';
    private $form_id = '${form.id}';
    private $embed_url = '${origin}';

    public function __construct() {
        add_shortcode('mavenforms', array($this, 'render_shortcode'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('rest_api_init', array($this, 'register_oembed'));
    }

    public function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'id' => $this->form_slug,
            'height' => '600',
            'theme' => 'light',
        ), $atts, 'mavenforms');

        $slug = sanitize_title($atts['id']);
        $height = intval($atts['height']);

        ob_start();
        ?>
        <div class="mavenforms-embed-container" 
             data-mavenforms="<?php echo esc_attr($slug); ?>" 
             data-height="<?php echo esc_attr($height); ?>"
             data-theme="<?php echo esc_attr($atts['theme']); ?>"
             style="width:100%;max-width:100%;margin:20px auto;">
            <div class="mavenforms-loading" style="padding:40px;text-align:center;color:#666;font-family:sans-serif;">
                Form yükleniyor...
            </div>
        </div>
        <script>
        (function(){
            function initMavenForms(){
                var containers = document.querySelectorAll('.mavenforms-embed-container:not([data-initialized])');
                containers.forEach(function(c){
                    c.setAttribute('data-initialized','true');
                    var slug = c.getAttribute('data-mavenforms');
                    var h = c.getAttribute('data-height') || 600;
                    var iframe = document.createElement('iframe');
                    iframe.src = '${origin}/forms/' + slug + '?embed=1';
                    iframe.style.cssText = 'width:100%;border:0;min-height:' + h + 'px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.08);';
                    iframe.setAttribute('loading','lazy');
                    iframe.setAttribute('sandbox','allow-scripts allow-forms allow-same-origin allow-popups');
                    iframe.title = '${form.title}';
                    c.innerHTML = '';
                    c.appendChild(iframe);
                    window.addEventListener('message', function(e){
                        if(e.origin !== '${origin}') return;
                        if(e.data && e.data.mavenforms && e.data.type === 'resize'){
                            iframe.style.height = e.data.height + 'px';
                        }
                    });
                });
            }
            if(document.readyState === 'loading'){
                document.addEventListener('DOMContentLoaded', initMavenForms);
            } else {
                initMavenForms();
            }
        })();
        </script>
        <?php
        return ob_get_clean();
    }

    public function enqueue_scripts() {
        // Self-contained, no external dependencies
    }

    public function register_oembed() {
        register_oembed_provider(
            '${origin}/api/public/forms/*',
            '${origin}/api/oembed',
            array('discover' => true)
        );
    }
}

new MavenForms_Embed();
`
  }

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-primary" />
            WordPress & Embed Entegrasyonu
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Formunuzu WordPress sitelerine veya herhangi bir web sitesine güvenle gömün.
          </p>
        </div>

        {/* Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${form.status === 'published' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium text-sm">
                  {form.status === 'published' ? 'Form Yayında' : 'Form Taslak Halde'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {form.status === 'published' ? 'Embed kodu kullanılabilir' : 'Önce formu yayınlayın'}
                </div>
              </div>
            </div>
            {form.status === 'published' && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aktif
              </Badge>
            )}
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="shortcode">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="shortcode" className="text-xs gap-1">
              <Puzzle className="w-3 h-3" /> WP Shortcode
            </TabsTrigger>
            <TabsTrigger value="plugin" className="text-xs gap-1">
              <Download className="w-3 h-3" /> WP Plugin
            </TabsTrigger>
            <TabsTrigger value="iframe" className="text-xs gap-1">
              <Code2 className="w-3 h-3" /> Iframe
            </TabsTrigger>
            <TabsTrigger value="js" className="text-xs gap-1">
              <Globe className="w-3 h-3" /> JS Embed
            </TabsTrigger>
          </TabsList>

          {/* WordPress Shortcode */}
          <TabsContent value="shortcode" className="space-y-4">
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  <Puzzle className="w-4 h-4 text-primary" />
                  WordPress Shortcode
                </h3>
                <p className="text-sm text-muted-foreground">
                  En güvenli yöntem. WordPress editörüne aşağıdaki kodu yapıştırın:
                </p>
              </div>

              <div className="relative">
                <pre className="rounded-lg bg-muted/50 p-4 text-sm font-mono border border-border overflow-x-auto">
                  {wpShortcode}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copy(wpShortcode, 'shortcode')}
                >
                  {copied === 'shortcode' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>

              <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-blue-900 dark:text-blue-100">
                    <strong>Kurulum:</strong> Önce aşağıdaki plugin'i indirip <code>/wp-content/plugins/</code> klasörüne yükleyin ve etkinleştirin. Sonra herhangi bir sayfa/yazıda <code>[mavenforms]</code> shortcode'unu kullanın.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg border border-border p-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
                  <div className="font-medium">Güvenli</div>
                  <div className="text-muted-foreground">XSS koruması</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <Smartphone className="w-4 h-4 text-primary mb-1" />
                  <div className="font-medium">Responsive</div>
                  <div className="text-muted-foreground">Otomatik yükseklik</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <Globe className="w-4 h-4 text-primary mb-1" />
                  <div className="font-medium">Cross-domain</div>
                  <div className="text-muted-foreground">Her sitede çalışır</div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* WordPress Plugin Download */}
          <TabsContent value="plugin" className="space-y-4">
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  <FileCode className="w-4 h-4 text-primary" />
                  WordPress Plugin (.php)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Özel MavenForms eklentisini indirin. Shortcode, oEmbed ve responsive iframe desteği içerir.
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <code>[mavenforms id="{form.slug}"]</code> shortcode
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Otomatik yükseklik ayarı (postMessage)
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Sandbox güvenlik özellikleri
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Lazy loading
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  WordPress 6.x uyumlu
                </div>
              </div>

              <Button onClick={downloadPlugin} className="w-full gap-2">
                <Download className="w-4 h-4" />
                Plugin'i İndir (mavenforms-{form.slug}.php)
              </Button>

              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-xs">
                <div className="flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-amber-900 dark:text-amber-100">
                    <strong>Kurulum adımları:</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-0.5">
                      <li>İndirilen <code>.php</code> dosyasını <code>/wp-content/plugins/mavenforms/</code> klasörüne yükleyin</li>
                      <li>WordPress admin &rarr; Eklentiler &rarr; MavenForms Embed'i etkinleştirin</li>
                      <li>Sayfa/yazı editörüne <code>[mavenforms]</code> yazın</li>
                    </ol>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Iframe */}
          <TabsContent value="iframe" className="space-y-4">
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  <Code2 className="w-4 h-4 text-primary" />
                  Iframe Embed
                </h3>
                <p className="text-sm text-muted-foreground">
                  En basit yöntem. Herhangi bir HTML sayfasına yapıştırın.
                </p>
              </div>

              <div className="relative">
                <pre className="rounded-lg bg-muted/50 p-4 text-xs font-mono border border-border overflow-x-auto">
                  {iframeCode}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copy(iframeCode, 'iframe')}
                >
                  {copied === 'iframe' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Genişlik</Label>
                  <Input defaultValue="100%" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Yükseklik</Label>
                  <Input defaultValue="600" className="h-8 text-sm" />
                </div>
              </div>

              <a href={formUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 w-full">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Formu Yeni Sekmede Aç
                </Button>
              </a>
            </Card>
          </TabsContent>

          {/* JavaScript Embed */}
          <TabsContent value="js" className="space-y-4">
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-primary" />
                  JavaScript Embed
                </h3>
                <p className="text-sm text-muted-foreground">
                  En gelişmiş yöntem. Otomatik yükseklik ayarı ve olay dinleyicileri içerir.
                </p>
              </div>

              <div className="relative">
                <pre className="rounded-lg bg-muted/50 p-4 text-xs font-mono border border-border overflow-x-auto">
                  {jsEmbedCode}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copy(jsEmbedCode, 'js')}
                >
                  {copied === 'js' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>

              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 text-xs space-y-1">
                <div className="font-medium text-emerald-900 dark:text-emerald-100 mb-1">Özellikler:</div>
                <div>&bull; Otomatik yükseklik (postMessage API)</div>
                <div>&bull; Lazy loading</div>
                <div>&bull; Sandbox güvenlik</div>
                <div>&bull; <code>mavenforms:submit</code> olay dinleyicisi</div>
                <div>&bull; MutationObserver (dinamik içerik)</div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs">
                <div className="font-medium mb-1">Olay Dinleme Örneği:</div>
                <pre className="font-mono text-[11px] overflow-x-auto">{`document.querySelector('[data-mavenforms]')
  .addEventListener('mavenforms:submit', (e) => {
    console.log('Form gönderildi!', e.detail);
    // Analytics, redirect, vb.
  });`}</pre>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Direct URL */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Direkt URL</Label>
            <Button variant="ghost" size="sm" onClick={() => copy(directUrl, 'url')} className="h-7 text-xs">
              {copied === 'url' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              Kopyala
            </Button>
          </div>
          <Input readOnly value={directUrl} className="font-mono text-sm" />
        </Card>
      </div>
    </ScrollArea>
  )
}
