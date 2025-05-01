const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const csvParser = require('csv-parser');
const iconv = require('iconv-lite');

// Utility function to get file icon and check if it's a directory
const getFileIconAndType = (filePath) => {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) return { icon: '📁', isDirectory: true };
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.csv' || ext === '.pdf') return { icon: '📄', isDirectory: false };
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') return { icon: '🖼️', isDirectory: false };
    return { icon: '📄', isDirectory: false }; // Default to a generic file icon
};

// GET route to display the directory structure
router.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login"); // ถ้าไม่ได้ล็อกอินให้ไปที่หน้า Login
    }
    const roleMap = req.app.locals.roleMap || {};
    
    const downloadsDir = path.join(__dirname, '../../public/downloads');

    fs.readdir(downloadsDir, (err, folders) => {
        if (err) {
            console.error('Error reading downloads directory:', err);
            return res.status(500).send('Error reading downloads directory');
        }

        const folderList = folders.map(folder => ({
            name: folder,
            path: folder,
            isDirectory: fs.statSync(path.join(downloadsDir, folder)).isDirectory(),
        }));

        res.render('downloads/index', { folders: folderList ,title: 'Downloads',
            page_title: '~',
            folder: 'Downloads',
            layout: 'layouts/layout-horizontal',
            session: req.session,
            roleMap: roleMap});
    });
});

// GET route to display files and subdirectories in the selected action_name folder
router.get('/:action_name', (req, res) => {
    const actionName = req.params.action_name;
    const actionDir = path.join(__dirname, '../../public/downloads', actionName);

    const roleMap = req.app.locals.roleMap || {};

    fs.readdir(actionDir, (err, items) => {
        if (err) {
            console.error('Error reading action directory:', err);
            return res.status(500).send('Error reading action directory');
        }

        const itemList = items.map(item => {
            const itemPath = path.join(actionDir, item);
            const { icon, isDirectory } = getFileIconAndType(itemPath);
            return {
                name: item,
                path: path.join(actionName, item),
                icon,
                isDirectory
            };
        });

        res.render('downloads/folder', { folders: itemList, folderName: actionName ,title: actionName,
            page_title: actionName,
            folder: 'Downloads',
            layout: 'layouts/layout-horizontal',session: req.session,
            roleMap: roleMap});
    });
});

router.get('/:action_name/:action_sup', (req, res) => {
    const actionName = req.params.action_name;
    const actionsup = req.params.action_sup;
    const actionDir = path.join(__dirname, '../../public/downloads', actionName, actionsup);

// สร้างเส้นทางไฟล์ CSV
const filePath = actionDir.replace('_csv', '.csv');
const roleMap = req.app.locals.roleMap || {};

// ตรวจสอบว่าไฟล์เป็น CSV หรือไม่
if (actionsup.toLowerCase().endsWith('_csv')) {
    const results = [];

    // อ่านไฟล์ CSV และแปลงเป็น JSON
    fs.createReadStream(filePath)
        .pipe(iconv.decodeStream('utf-8')) // แปลงให้เป็น utf-8 ถ้าจำเป็น
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            // ส่งผลลัพธ์ไปยัง EJS
            res.render('downloads/files', { data: results ,title: actionsup,
                page_title: actionName+' > '+actionsup.replace('_csv', '.csv'),
                folder: 'Downloads',
                layout: 'layouts/layout-horizontal',});
        })
        .on('error', (err) => {
            console.error('Error reading CSV file:', err);
            res.status(500).send('Error reading CSV file');
        });

} else {
    fs.readdir(actionDir, (err, items) => {
        if (err) {
            console.error('Error reading action directory:', err);
            return res.status(500).send('Error reading action directory');
        }

        const itemList = items.map(item => {
            const itemPath = path.join(actionDir, item);
            const { icon, isDirectory } = getFileIconAndType(itemPath);
            return {
                name: item,
                path: path.join(actionName, actionsup, item),
                icon,
                isDirectory
                
            };
        });

        res.render('downloads/folder', { folders: itemList, folderName: actionName ,title: actionsup,
            page_title: actionName+' > '+actionsup,
            folder: 'Downloads',
            layout: 'layouts/layout-horizontal',session: req.session,
            roleMap: roleMap});
    });
}
});

router.get('/:action_name/:action_sup/:type', (req, res) => {
    const actionName = req.params.action_name;
    const actionsup = req.params.action_sup;
    const filetype = req.params.type;
    const actionDir = path.join(__dirname, '../../public/downloads', actionName, actionsup, filetype);

    // สร้างเส้นทางไฟล์ CSV
    const filePath = actionDir.replace('_csv', '.csv');
    const roleMap = req.app.locals.roleMap || {};

    // ตรวจสอบว่าไฟล์เป็น CSV หรือไม่
    if (filetype.toLowerCase().endsWith('_csv')) {
        const results = [];

        // อ่านไฟล์ CSV และแปลงเป็น JSON
        fs.createReadStream(filePath)
            .pipe(iconv.decodeStream('utf-8')) // แปลงให้เป็น utf-8 ถ้าจำเป็น
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                // ส่งผลลัพธ์ไปยัง EJS
                res.render('downloads/files', { data: results ,title: filetype,
                    page_title: actionName+' > '+actionsup+' > '+filetype.replace('_csv', '.csv'),
                    folder: 'Downloads',
                    layout: 'layouts/layout-horizontal',});
            })
            .on('error', (err) => {
                console.error('Error reading CSV file:', err);
                res.status(500).send('Error reading CSV file');
            });

    } else {
        fs.readdir(actionDir, (err, items) => {
            if (err) {
                console.error('Error reading action directory:', err);
                return res.status(500).send('Error reading action directory');
            }

            const itemList = items.map(item => {
                const itemPath = path.join(actionDir, item);
                const { icon, isDirectory } = getFileIconAndType(itemPath);
                return {
                    name: item,
                    path: path.join(actionName, actionsup, filetype, item),
                    icon,
                    isDirectory
                };
            });

            res.render('downloads/index', { folders: itemList, folderName: actionName ,title: filetype,
                page_title: actionName+' > '+actionsup+' > '+filetype,
                folder: 'Downloads',
                layout: 'layouts/layout-horizontal',session: req.session,
                roleMap: roleMap});
        });
    }
});


router.get('/:action_name/:action_sup/:type/:identify', (req, res) => {
    const actionName = req.params.action_name;
    const actionsup = req.params.action_sup;
    const filetype = req.params.type;
    const fileidentify = req.params.identify;
    const actionDir = path.join(__dirname, '../../public/downloads', actionName, actionsup, filetype, fileidentify);

    fs.readdir(actionDir, (err, items) => {
        if (err) {
            console.error('Error reading action directory:', err);
            return res.status(500).send('Error reading action directory');
        }

        const itemList = items.map(item => {
            const itemPath = path.join(actionDir, item);
            const { icon, isDirectory } = getFileIconAndType(itemPath);
            return {
                name: item,
                path: path.join(actionName, actionsup, filetype, fileidentify, item),
                icon,
                isDirectory
            };
        });

        res.render('downloads/files', { folders: itemList, folderName: actionName ,title: fileidentify,session: req.session,
            layout: 'layouts/layout-without-nav'});
    });
});


// JSON file path for status
const statusFilePath = path.join(__dirname, '../../public/load-image-status.json');

// Function to update JSON status file
async function updateStatusFile(actionName, fileName, status) {
    try {
        const data = await fs.promises.readFile(statusFilePath, 'utf-8');
        const statuses = JSON.parse(data);

        if (statuses[actionName]) {
            const item = statuses[actionName].find(item => item.name === fileName);
            if (item) {
                item.status = status;
            }
        }

        await fs.promises.writeFile(statusFilePath, JSON.stringify(statuses, null, 2), 'utf-8');
        console.log(`Status for ${actionName}/${fileName} updated to "${status}".`);
    } catch (error) {
        console.error('Error updating status file:', error);
    }
}

// DELETE route to delete a single file or folder
router.delete('/delete', (req, res) => {
    const filePath = req.query.path;
    const fullPath = path.join(__dirname, '../../public/downloads', filePath);

    // Split to get action and file name if possible
    const pathParts = filePath.split('/');
    const actionName = pathParts[0];
    const fileName = pathParts[1];

    fs.stat(fullPath, (err, stat) => {
        if (err) {
            console.error('Error checking item:', err);
            return res.status(500).json({ success: false, message: 'Item not found.' });
        }

        const isDeletable = pathParts.length === 2 && fileName.endsWith('.csv');
        const handleStatusUpdate = () => {
            if (isDeletable) {
                updateStatusFile(actionName, fileName, 'done');
            }
        };

        if (stat.isDirectory()) {
            fs.rm(fullPath, { recursive: true, force: true }, (err) => {
                if (err) {
                    console.error('Error deleting directory:', err);
                    return res.status(500).json({ success: false, message: 'Failed to delete directory.' });
                }
                handleStatusUpdate();
                res.json({ success: true });
            });
        } else {
            fs.unlink(fullPath, (err) => {
                if (err) {
                    console.error('Error deleting file:', err);
                    return res.status(500).json({ success: false, message: 'Failed to delete file.' });
                }
                handleStatusUpdate();
                res.json({ success: true });
            });
        }
    });
});

// POST route to delete multiple files or folders
router.post('/delete-bulk', (req, res) => {
    const { paths } = req.body;

    const deletePromises = paths.map(filePath => {
        const fullPath = path.join(__dirname, '../../public/downloads', filePath);
        const pathParts = filePath.split('/');
        const actionName = pathParts[0];
        const fileName = pathParts[1];

        return new Promise((resolve, reject) => {
            fs.stat(fullPath, (err, stat) => {
                if (err) return reject(new Error('Item not found.'));

                const isDeletable = pathParts.length === 2 && fileName.endsWith('.csv');
                const handleStatusUpdate = () => {
                    if (isDeletable) {
                        updateStatusFile(actionName, fileName, 'done');
                    }
                };

                if (stat.isDirectory()) {
                    fs.rm(fullPath, { recursive: true, force: true }, err => {
                        if (err) return reject(new Error('Failed to delete directory.'));
                        handleStatusUpdate();
                        resolve();
                    });
                } else {
                    fs.unlink(fullPath, err => {
                        if (err) return reject(new Error('Failed to delete file.'));
                        handleStatusUpdate();
                        resolve();
                    });
                }
            });
        });
    });

    Promise.all(deletePromises)
        .then(() => res.json({ success: true }))
        .catch(error => {
            console.error('Error deleting items:', error);
            res.status(500).json({ success: false, message: error.message });
        });
});

module.exports = router;
