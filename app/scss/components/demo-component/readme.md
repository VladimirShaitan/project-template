Component should have some structure
    
    Component Folder
    Example: 'demo-component'

    Component Desktop styles
    Example: 'demo-component.scss'

    Component Media styles (for small screens) (same as folder name 
    but with suffix '-media' and widthout '-' too)
    Example: 'demo-component-media.scss'

    Component index file (sould be always 'index.scss')
    In your component index you sould import all you previous files:
    
    Example:
    import Component desktop styles (@import './'demo-component.scss')
    import Component media styles (@import './'demo-component-media.scss')
    

    Structure example:

        demo-component (folder)
            - demo-component.scss (desktop)
            - demo-component-media.scss (media)
            - index.scss
                - @import './demo-component' 
                - @import './demo-component-media' 
        