define(['jquery', 'backbone', 'underscore', 'app', 'models/TreeCollection',
    './packageView', './fileView', 'hbs!tpl/dashboard/layout', 'select2'],
    function($, Backbone, _, App, TreeCollection, PackageView, FileView, template) {
        'use strict';
        // Renders whole dashboard
        return Backbone.Marionette.ItemView.extend({

            template: template,

            events: {
            },

            ui: {
                'packages': '.package-list',
                'files': '.file-list'
            },

            // Package tree
            tree: null,
            // Current open files
            files: null,
            // True when loading animation is running
            isLoading: false,

            initialize: function() {
                App.dashboard = this;
                this.tree = new TreeCollection();

                var self = this;
                // When package is added we reload the data
                App.vent.on('package:added', function() {
                    console.log('Package tree caught, package:added event');
                    self.tree.fetch();
                });

                App.vent.on('file:updated', _.bind(this.fileUpdated, this));

                // TODO: merge?
                this.init();
                // TODO: file:added
                // TODO: package:deleted
                // TODO: package:updated
            },

            init: function() {
                var self = this;
                // TODO: put in separated function
                // TODO: order of elements?
                // Init the tree and callback for package added
                this.tree.fetch({success: function() {
                    self.update();
                    self.tree.get('packages').on('add', function(pack) {
                        console.log('Package ' + pack.get('pid') + ' added to tree');
                        self.appendPackage(pack, 0, true);
                        self.openPackage(pack);
                    });
                }});

                this.$('.input').select2({tags: ['a', 'b', 'sdf']});
            },

            update: function() {
                console.log('Update package list');

                var packs = this.tree.get('packages');
                this.files = this.tree.get('files');

                if (packs)
                    packs.each(_.bind(this.appendPackage, this));

                if (!this.files || this.files.length === 0) {
                    // no files are displayed
                    this.files = null;
                    // Open the first package
                    if (packs && packs.length >= 1)
                        this.openPackage(packs.at(0));
                }
                else
                    this.files.each(_.bind(this.appendFile, this));

                return this;
            },

            // TODO sorting ?!
            // Append a package to the list, index, animate it
            appendPackage: function(pack, i, animation) {
                var el = new PackageView({model: pack}).render().el;
                $(this.ui.packages).appendWithAnimation(el, animation);
            },

            appendFile: function(file, i, animation) {
                var el = new FileView({model: file}).render().el;
                $(this.ui.files).appendWithAnimation(el, animation);
            },

            // Show content of the packages on main view
            openPackage: function(pack) {
                var self = this;

                // load animation only when something is shown and its different from current package
                if (this.files && this.files !== pack.get('files'))
                    self.loading();

                pack.fetch({silent: true, success: function() {
                    console.log('Package ' + pack.get('pid') + ' loaded');
                    self.contentReady(pack.get('files'));
                }, failure: function() {
                    self.failure();
                }});

            },

            contentReady: function(files) {
                var old_files = this.files;
                this.files = files;
                App.vent.trigger('dashboard:contentReady');

                // show the files when no loading animation is running and not already open
                if (!this.isLoading && old_files !== files)
                    this.show();
            },

            // Do load animation, remove the old stuff
            loading: function() {
                this.isLoading = true;
                this.files = null;
                var self = this;
                $(this.ui.files).fadeOut({complete: function() {
                    // All file views should vanish
                    App.vent.trigger('dashboard:destroyContent');

                    // Loading was faster than animation
                    if (self.files)
                        self.show();

                    self.isLoading = false;
                }});
            },

            failure: function() {
                // TODO
            },

            show: function() {
                // fileUL has to be resetted before
                this.files.each(_.bind(this.appendFile, this));
                //TODO: show placeholder when nothing is displayed (filtered content empty)
                $(this.ui.files).fadeIn();
                App.vent.trigger('dashboard:updated');
            },

            // Refresh the file if it is currently shown
            fileUpdated: function(data) {
                var fid;
                if (_.isObject(data))
                    fid = data.fid;
                else
                    fid = data;
                // this works with ids and object TODO: not anymore
                var file = this.files.get(fid);
                if (file)
                    if (_.isObject(data)) // update directly
                        file.set(data);
                    else // fetch from server
                        file.fetch();
            }
        });
    });