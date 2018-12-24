// untuk mereturn halaman view
function views ( path ) {
    this.path = path;
    this.view = function(view) {
        return this.path + `/${view}.html`;
    }
};

module.exports = views;