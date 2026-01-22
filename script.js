// --- 1. CONFIG & UTILS ---
const { createClient } = supabase;
const supabaseUrl = 'https://llbazqwparjaptsjbxxp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsYmF6cXdwYXJqYXB0c2pieHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDk0MDQsImV4cCI6MjA4NDU4NTQwNH0.NcHwvFMnzU6GgHBaud4nNJgwFBK1WQtxAdGbcM-BaYU';
const db = createClient(supabaseUrl, supabaseKey);

// Auto Year
const dateNow = new Date();
$('.current-year').text(dateNow.getFullYear() + 543);

// Auto Address (jQuery Thailand)
$.Thailand({ 
    $district: $('#dashDistrict'), 
    $amphoe: $('#dashAmphoe'), 
    $province: $('#dashProvince'), 
    $zipcode: $('#dashZip') 
});

// Generate Room Options
let roomHtml = '<option value="">เลือกห้อง</option>';
for(let i=1; i<=14; i++) roomHtml += `<option value="${i}">ห้อง ${i}</option>`;
$('#dashRoom').html(roomHtml);

// --- 2. DATE PICKER LOGIC (พ.ศ.) ---
function initDatePicker() {
    const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    
    // Days
    let dHtml = '<option value="">วัน</option>';
    for(let i=1; i<=31; i++) dHtml += `<option value="${i.toString().padStart(2,'0')}">${i}</option>`;
    $('#dob_day').html(dHtml);

    // Months
    let mHtml = '<option value="">เดือน</option>';
    months.forEach((m, index) => {
        mHtml += `<option value="${(index+1).toString().padStart(2,'0')}">${m}</option>`;
    });
    $('#dob_month').html(mHtml);

    // Years (BE) - Range: Current Year down to 20 years ago
    let currentYearBE = dateNow.getFullYear() + 543;
    let yHtml = '<option value="">ปี พ.ศ.</option>';
    for(let i=currentYearBE; i >= currentYearBE-25; i--) {
        yHtml += `<option value="${i}">${i}</option>`;
    }
    $('#dob_year').html(yHtml);
}
initDatePicker();

// --- 3. CORE FUNCTIONS ---

// Function 1: Check Student ID
async function checkStudentStatus(e) {
    e.preventDefault();
    const stdId = $('#inputStdId').val().trim();
    const btn = $('#btnCheck');
    
    btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจสอบ...');

    try {
        const { data, error } = await db.from('student_council').select('*').eq('std_id', stdId).single();
        
        if (error || !data) throw new Error('ไม่พบข้อมูลรหัสนักเรียนนี้ในระบบ');

        // Hide Step 1
        $('#step1-check').hide();
        $('#cardContainer').addClass('wide'); 

        if (!data.id_card || data.id_card.length < 5) {
            // Case: New User -> Activate
            $('#step2-activate').fadeIn();
            $('#actFullName').val((data.prefix || '') + data.fname_th + ' ' + data.lname_th);
            $('#actRowId').val(data.id);
            $('#cardContainer').removeClass('wide'); // Keep small for activate
        } else {
            // Case: Returning User -> Login
            $('#step2-login').fadeIn();
            $('#loginName').text('สวัสดี ' + data.fname_th+ ' ' + data.lname_th);
            $('#loginRowId').val(data.id);
            $('#loginIdCardInput').focus();
            $('#cardContainer').removeClass('wide'); // Keep small for login
        }

    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'ไม่พบข้อมูล',
            text: 'ไม่พบรหัสนักเรียนนี้ ในฐานข้อมูลคณะกรรมการสภานักเรียน',
            confirmButtonColor: '#6A1B9A'
        });
    } finally {
        btn.prop('disabled', false).html('ถัดไป <i class="fa-solid fa-arrow-right ms-2"></i>');
    }
}

// Function 2: Activate Account
async function submitActivation(e) {
    e.preventDefault();
    const idCard = $('#actIdCard').val();
    const btn = $(e.target).find('button[type=submit]');

    if(idCard.length !== 13 || isNaN(idCard)) {
        Swal.fire('ข้อผิดพลาด', 'กรุณากรอกเลขบัตรประชาชน 13 หลักให้ถูกต้อง', 'warning');
        return;
    }

    btn.prop('disabled', true).text('กำลังบันทึก...');

    try {
        const { error } = await db.from('student_council').update({
            id_card: idCard,
            phone: $('#actPhone').val()
        }).eq('id', $('#actRowId').val());

        if(error) throw error;

        Swal.fire({
            icon: 'success',
            title: 'เปิดใช้งานสำเร็จ',
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            loadDashboard($('#actRowId').val());
        });

    } catch (err) {
        Swal.fire('Error', err.message, 'error');
        btn.prop('disabled', false).text('ยืนยันและเข้าสู่ระบบ');
    }
}

// Function 3: Login
async function handleLogin(e) {
    e.preventDefault();
    const inputCard = $('#loginIdCardInput').val();
    const rowId = $('#loginRowId').val();
    
    try {
        const { data } = await db.from('student_council').select('id_card').eq('id', rowId).single();
        if (data.id_card !== inputCard) throw new Error('รหัสผ่านไม่ถูกต้อง');
        
        loadDashboard(rowId);
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'เข้าสู่ระบบไม่สำเร็จ',
            text: 'เลขบัตรประชาชนไม่ถูกต้อง',
            confirmButtonColor: '#6A1B9A'
        });
    }
}

// Function 4: Load Dashboard Data
async function loadDashboard(id) {
    // Hide previous steps
    $('#step2-activate').hide();
    $('#step2-login').hide();
    
    // Show Dashboard
    $('#cardContainer').addClass('wide'); 
    $('#step3-dashboard').fadeIn();
    window.scrollTo(0, 0); 

    const { data } = await db.from('student_council').select('*').eq('id', id).single();

    // Map data to fields
    $('#dashRowId').val(data.id);
    $('#dashStdId').val(data.std_id);
    $('#dashFname').val(data.fname_th);
    $('#dashLname').val(data.lname_th);
    
    $('#dashFnameEN').val(data.fname_en);
    $('#dashLnameEN').val(data.lname_en);
    $('#dashNickname').val(data.nickname);
    $('#dashPhone').val(data.phone);
    $('#dashLine').val(data.line_id);
    
    $('#dashSchoolEmail').val(data.school_email || ''); 
    $('#dashPersonalEmail').val(data.personal_email);
    $('#dashSocial').val(data.social);
    
    // Handle Date Split
    if(data.birthdate) {
        const parts = data.birthdate.split('-'); 
        if(parts.length === 3) {
            $('#dob_day').val(parts[2]);
            $('#dob_month').val(parts[1]);
            const yearBE = parseInt(parts[0]) + 543;
            $('#dob_year').val(yearBE);
        }
    }

    $('#dashBlood').val(data.blood_type);
    $('#dashShirt').val(data.shirt_size);
    $('#dashRoom').val(data.room);
    $('#dashParent').val(data.parent_name);
    $('#dashParentPhone').val(data.parent_phone);
    
    $('#dashAddrDetail').val(data.addr_no);
    $('#dashDistrict').val(data.district);
    $('#dashAmphoe').val(data.amphoe);
    $('#dashProvince').val(data.province);
    $('#dashZip').val(data.zipcode);
}

// Function 5: Submit Update
async function submitUpdate(e) {
    e.preventDefault();
    const btn = $('#btnSave');
    
    // Validation: School Email
    const schoolEmailInput = $('#dashSchoolEmail');
    const schoolEmailValue = schoolEmailInput.val().trim().toLowerCase();

    if (!schoolEmailValue.endsWith('@mst.ac.th')) {
        Swal.fire({
            icon: 'warning',
            title: 'อีเมลโรงเรียนไม่ถูกต้อง',
            html: 'กรุณากรอกอีเมลที่ลงท้ายด้วย <b>@mst.ac.th</b> เท่านั้น',
            confirmButtonColor: '#6A1B9A'
        });
        schoolEmailInput.focus();
        return; 
    }
    
    btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...');

    // Combine Date
    const d = $('#dob_day').val();
    const m = $('#dob_month').val();
    const yBE = $('#dob_year').val();
    let birthdateISO = null;

    if(d && m && yBE) {
        const yAD = parseInt(yBE) - 543;
        birthdateISO = `${yAD}-${m}-${d}`;
    }

    try {
        const { error } = await db.from('student_council').update({
            fname_en: $('#dashFnameEN').val().toUpperCase(),
            lname_en: $('#dashLnameEN').val().toUpperCase(),
            nickname: $('#dashNickname').val(),
            birthdate: birthdateISO,
            phone: $('#dashPhone').val(),
            line_id: $('#dashLine').val(),
            school_email: schoolEmailValue, 
            personal_email: $('#dashPersonalEmail').val(),
            social: $('#dashSocial').val(),
            blood_type: $('#dashBlood').val(),
            shirt_size: $('#dashShirt').val(),
            room: $('#dashRoom').val(),
            parent_name: $('#dashParent').val(),
            parent_phone: $('#dashParentPhone').val(),
            addr_no: $('#dashAddrDetail').val(),
            district: $('#dashDistrict').val(),
            amphoe: $('#dashAmphoe').val(),
            province: $('#dashProvince').val(),
            zipcode: $('#dashZip').val()
        }).eq('id', $('#dashRowId').val());

        if(error) throw error;

        Swal.fire({
            icon: 'success',
            title: 'บันทึกข้อมูลเรียบร้อย',
            text: 'ขอบคุณที่ให้ความร่วมมือครับ',
            confirmButtonColor: '#6A1B9A',
            timer: 2000
        });

    } catch (err) {
        Swal.fire('เกิดข้อผิดพลาดในการบันทึก', err.message, 'error');
    } finally {
        btn.prop('disabled', false).html('<i class="fa-solid fa-save fa-lg"></i> บันทึกข้อมูลทั้งหมด');
    }
}