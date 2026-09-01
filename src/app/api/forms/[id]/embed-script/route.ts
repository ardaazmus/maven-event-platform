import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Returns a JavaScript file that embeds the form into a placeholder div
// Usage: <div data-mavenforms="form-slug"></div><script src="/api/forms/{id}/embed-script"></script>
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug') || id

  const form = await db.form.findFirst({
    where: { OR: [{ id }, { slug }], deletedAt: null },
    select: { id: true, slug: true, title: true, status: true },
  })

  if (!form) {
    return new Response('// Form not found', {
      headers: { 'Content-Type': 'application/javascript' },
      status: 404,
    })
  }

  const baseUrl = req.nextUrl.origin
  const formUrl = `${baseUrl}/forms/${form.slug}`

  // Self-contained JavaScript that:
  // 1. Finds all [data-mavenforms] elements
  // 2. Creates an iframe with the form URL
  // 3. Handles responsive resizing via postMessage
  // 4. Scoped CSS so it doesn't interfere with host page
  const script = `(function(){
  if (window.__mavenformsEmbedLoaded) return;
  window.__mavenformsEmbedLoaded = true;

  function init() {
    var containers = document.querySelectorAll('[data-mavenforms]');
    containers.forEach(function(container) {
      if (container.getAttribute('data-mavenforms-initialized')) return;
      container.setAttribute('data-mavenforms-initialized', 'true');

      var slug = container.getAttribute('data-mavenforms');
      var height = container.getAttribute('data-height') || '600';
      var theme = container.getAttribute('data-theme') || 'light';

      // Create wrapper
      var wrapper = document.createElement('div');
      wrapper.className = 'mavenforms-embed-wrapper';
      wrapper.style.cssText = 'width:100%;max-width:100%;margin:0 auto;position:relative;overflow:hidden;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.08);background:#fff;';

      // Create loading placeholder
      var loading = document.createElement('div');
      loading.style.cssText = 'padding:40px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#666;';
      loading.innerHTML = '<div style="display:inline-block;width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#10b981;border-radius:50%;animation:mavenformsSpin 0.8s linear infinite;margin-right:8px;vertical-align:middle;"></div>Form yükleniyor...';

      // Add spin animation
      if (!document.getElementById('mavenforms-embed-style')) {
        var style = document.createElement('style');
        style.id = 'mavenforms-embed-style';
        style.textContent = '@keyframes mavenformsSpin{to{transform:rotate(360deg)}}';
        document.head.appendChild(style);
      }

      wrapper.appendChild(loading);
      container.innerHTML = '';
      container.appendChild(wrapper);

      // Create iframe
      var iframe = document.createElement('iframe');
      iframe.src = '${baseUrl}/forms/' + slug + '?embed=1';
      iframe.style.cssText = 'width:100%;border:0;display:none;min-height:' + height + 'px;';
      iframe.title = form.title || 'MavenForms';
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('allow', 'geolocation; microphone; camera');
      iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox');

      iframe.onload = function() {
        loading.style.display = 'none';
        iframe.style.display = 'block';
      };

      wrapper.appendChild(iframe);

      // Listen for height changes from the form
      window.addEventListener('message', function(event) {
        if (event.origin !== '${baseUrl}') return;
        if (event.data && event.data.mavenforms && event.data.type === 'resize') {
          iframe.style.height = event.data.height + 'px';
        }
        if (event.data && event.data.mavenforms && event.data.type === 'submit') {
          container.dispatchEvent(new CustomEvent('mavenforms:submit', { detail: event.data.payload }));
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-init on dynamic content changes (MutationObserver)
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        if (m.addedNodes && m.addedNodes.length) {
          init();
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();`

  return new Response(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
  })
}
