var mongoClient = require('mongodb').MongoClient;
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var nodeMailer = require('nodemailer');
var flash = require('req-flash');
var session = require('express-session');
var formidable = require('formidable');
var fs = require('fs');
var methodOverride = require('method-override');
var views = __dirname + '/public/resources/views';
var layouts = __dirname + '/public/resources/layouts';
var port = 5000;

// untuk view
function view ( view ) {
    return views + `/${view}.ejs`;
};

// settingan expressjs
app.use(express.static('public'));
app.use('/node', express.static('node_modules'));
app.use('/layouts', express.static(layouts));
app.use(bodyParser());
app.use(session({secret: '123'}));
app.use(flash());
app.set('view engine', 'ejs');

// fungsi yang akan selalu berjalan
app.use(function(req, res, next){
    global.test = 'kampret';
    next();
});

// untuk ovveriding method selain get dan post
app.use(methodOverride(function(req, res){
    if ( '_method' in req.body )
        var method = req.body._method;

        delete req.body._method;

        return method;
}))

// koneksi ke database mongodb
mongoClient.connect('mongodb://localhost:27017', function(err, client) {
    if ( err ) throw err;

    // pilih database dan tabelnya
    var akademik = client.db('akademik');
    var mahasiswas = akademik.collection('mahasiswa');
    var dosens = akademik.collection('dosen');

    // settingan untuk kirim email
    function transporterSendEmail(from, to, subject, html) {
        var transporter = nodeMailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'ramdanriawan3@gmail.com',
                pass: 'sdckroccyisrobtt'
            }
        });

        // verify connection configuration
        transporter.verify(function(err, success){
            if ( err ) throw err;
            console.log("Server siap mengirimkan email");
        })

        var mailOptions = {
            from: from,
            to: to,
            subject: subject,
            html: html 
         };

        transporter.sendMail(mailOptions, function(err, res){
            if ( err ) throw err;
            console.log('Email terkirim: ' + res.response);
        });
    }

    // handle ketika user mengakses halaman awal atau registrasi
    app.get('/', function(req, res){
        res.render(view('index'), { success: req.flash().success });
    });

    app.get('/register', function(req, res){
        res.render(view('index'), { success: req.flash().success });
    });
    
    app.post('/store', function(req, res){
        var request = req.body; 

        // simpan datanya ke database
        if ( request.sebagai == 'mahasiswa' ) {
            mahasiswas.insert(request);
        } else if ( request.sebagai == 'dosen' ) {
            dosens.insert(request);
        }

        // kirimkan pesan bahwa dia berhasil teregistrasi
        res.end("Berhasil teregistrasi sebagai " + request.sebagai);
    });

    // handle request login dari user
    app.get('/login', function(req, res){
        res.render(view('login'));
    });

    app.post('/login', function(req, res){
        var request = req.body;

        // kirimkan email notifikasi bahwa dia berhasil login
        transporterSendEmail('ramdan', 'ramdanriawan3@gmail.com', 'ngetest', '<h1>test email</h1>');

        if ( request.sebagai == 'mahasiswa' ) {
            mahasiswas.findOne({ nim: request.nim, password: request.password }, function(err, mahasiswa){
                if ( err ) res.end('invalid credentials');
                else if ( mahasiswa !== null )
                    res.redirect('/mahasiswa/' + mahasiswa.nim);
                else
                    res.end("Tidak ditemukan");
            }); 
        }
        else if ( request.sebagai == 'dosen' ) {
            dosens.findOne({ nim: request.nim, password: request.password }, function(err, dosen){
                if ( err ) res.end('invalid credentials');
                else if ( dosen !== null )
                    res.redirect('/dosen/' + dosen.nim);
                else
                    res.end("Tidak ditemukan");
            });
        }
    });

    // untuk menangani request di halaman mahasiswa
    app.get('/mahasiswa/:nim', function(req, res){
        var nim = req.params.nim;

        mahasiswas.findOne({nim: nim}, function(err, mahasiswa){
            if ( err ) throw err;
            res.render(view('mahasiswa'), { mahasiswa: mahasiswa, success: req.flash().success });
        });
    });

    // untuk menangani request edit mahasiswa
    app.get('/mahasiswa/:nim/edit', function(req, res){
        mahasiswas.findOne({ nim: req.params.nim }, function(err, mahasiswa){
            if ( err ) throw err;

            res.render(view('mahasiswa_edit'), { mahasiswa: mahasiswa });
        })
    });

    // untuk menangani request data yang diedit oleh mahasiswa
    app.post('/mahasiswa/:nim', function(req, res){
        request = req.body;

        mahasiswas.update({ nim: req.params.nim }, { $set: request }, function(err, res2){
            req.flash('success', 'berhasil mengedit data mahasiswa ' + req.body.nim);
            res.redirect('/mahasiswa/' + req.params.nim);
        });
    });

    // untuk menangani request data untuk mendelete mahasiswa
    app.delete('/mahasiswa/:nim', function(req, res){
        mahasiswas.deleteOne({ nim: req.params.nim }, function(err, succ){
            if ( err ) throw err;
            console.log(succ);
            req.flash('success', 'Berhasil mendelete data mahasiswa ' + req.params.nim );
            res.redirect('/');
        });
    });
    
    // untuk menangani request di halaman dosen
    app.get('/dosen/:nim', function(req, res){
        var nim = req.params.nim;

        dosens.findOne({ nim: nim }, function(err, dosen){
            if ( err ) 
                throw err;
            else if ( dosen != null) 
                res.render(view('dosen'), { dosen: dosen, success: req.flash().success });
            else
                res.end("Data dosen tidak ditemukan");
        });
    });

    // untuk menangani request edit dosen
    app.get('/dosen/:nim/edit', function(req, res){
        dosens.findOne({ nim: req.params.nim }, function(err, dosen){
            if ( err ) throw err;

            res.render(view('dosen_edit'), { dosen: dosen });
        });
    });

    // untuk menangani request data yang diedit oleh dosen
    app.post('/dosen/:nim', function(req, res){
        request = req.body;

        dosens.update({ nim: req.params.nim }, { $set: request }, function(err, res2){
            req.flash('success', 'berhasil mengedit data dosen ' + req.body.nim);
            res.redirect('/dosen/' + req.params.nim);
        });
    });

    // untuk menangani request data untuk mendelete dosen
    app.delete('/dosen/:nim', function(req, res){
        dosens.deleteOne({ nim: req.params.nim }, function(err, succ){
            if ( err ) throw err;
            console.log(succ);
            req.flash('success', 'Berhasil mendelete data dosen ' + req.params.nim );
            res.redirect('/');
        });
    });

    // untuk belajar upload files
    app.get('/upload', function(req, res){
        res.render(view('upload'));
    });

    app.post('/upload', function(req, res){
        var form = new formidable.IncomingForm();
            form.uploadDir = './upload';
            form.keepExtensions = true;
            form.multiples = true;
            
        form.parse(req, function(err, fields, files){
            // pindahkan dan rename file ke folder baru
            files.file.forEach(function(file, index){
                var oldpath = file.path;
                var newpath = './upload/' + file.name;
                fs.rename(oldpath, newpath, function(err, succ){
                    if ( err ) throw err;
                    res.end("File telah berhasil diupload");
                });
            });
        });
    });

    // untuk mengantisipasi halaman 404
    app.use(function(req, res){
        res.status(404);
        res.end("Whatt??? I don't know what would you want");
    });

    // listen aplikasi di port yang ditentukan
    app.listen(port, function(){
        console.log(`Sedang listen di port ${port}`);
    });
});

