/* WordPress Gutenberg block — MavenForms (M08.4) */
(function(blocks, element, blockEditor){
  var el = element.createElement;
  var InspectorControls = blockEditor.InspectorControls;
  var SelectControl = element.SelectControl || function(){return null};
  blocks.registerBlockType('mavenforms/form', {
    title: 'MavenForms',
    icon: 'feedback',
    category: 'embed',
    attributes: { slug: {type:'string', default:''}, mode: {type:'string', default:'iframe'} },
    edit: function(props){
      var attrs = props.attributes;
      return el('div', {className: props.className},
        el('p', {}, 'MavenForms — slug:'),
        el('input', {type:'text', value: attrs.slug, placeholder:'tekno-zirvesi-2026', onChange: function(e){ props.setAttributes({slug: e.target.value}) }, style:{width:'100%'}}),
        el(InspectorControls, {},
          el('div', {style:{padding:'10px'}},
            el('label', {}, 'Mode: '),
            el('select', {value: attrs.mode, onChange: function(e){ props.setAttributes({mode: e.target.value}) }},
              el('option', {value:'iframe'}, 'iframe'),
              el('option', {value:'inline'}, 'inline')
            )
          )
        ),
        el('small', {}, 'Preview uses public slug, no secret.')
      );
    },
    save: function(){ return null; } // server-rendered via render.php
  });
})(window.wp.blocks, window.wp.element, window.wp.blockEditor);
