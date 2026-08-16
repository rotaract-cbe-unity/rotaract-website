/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY
   DOCX Document Generator - js/docx-generator.js
   Version: 4.0 - Fixed AlignmentType and all references
   Uses docx.js library from CDN
   ============================================================ */

(function () {
    'use strict';

    // ============================================================
    // WAIT FOR DOCX LIBRARY
    // ============================================================
    function getDocx() {
        // docx library exposes everything on window.docx
        if (window.docx) return window.docx;
        // Some CDN versions expose directly
        if (window.Document && window.Packer) {
            return {
                Document: window.Document,
                Packer: window.Packer,
                Paragraph: window.Paragraph,
                TextRun: window.TextRun,
                Table: window.Table,
                TableRow: window.TableRow,
                TableCell: window.TableCell,
                ImageRun: window.ImageRun,
                PageBreak: window.PageBreak,
                AlignmentType: window.AlignmentType,
                BorderStyle: window.BorderStyle,
                WidthType: window.WidthType,
                ShadingType: window.ShadingType,
                UnderlineType: window.UnderlineType,
                convertInchesToTwip: window.convertInchesToTwip,
                HeadingLevel: window.HeadingLevel
            };
        }
        return null;
    }

    // ============================================================
    // SUPABASE CONFIG
    // ============================================================
    const API_URL = 'https://dledwtepuvzzztfypbgn.supabase.co/rest/v1';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZWR3dGVwdXZ6enp0ZnlwYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDk2NDMsImV4cCI6MjA5ODcyNTY0M30.9ZcngwUsfl5AkFaCDR9-ljoLLOYeGwwK0AKaHfeyGhY';
    const EDGE_URL = 'https://dledwtepuvzzztfypbgn.supabase.co/functions/v1';
    const HEADERS = {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + ANON_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    // ============================================================
    // HELPERS
    // ============================================================
    function esc(t) { return String(t || ''); }

    function fDate(d) {
        if (!d) return '';
        try {
            const date = new Date(d.includes('T') ? d : d + 'T00:00:00');
            return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) { return d; }
    }

    function fTime(t) {
        if (!t) return '';
        try {
            const [h, m] = t.split(':').map(Number);
            return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
        } catch (e) { return t; }
    }

    function toast(msg, type) {
        if (window.UnityAuth && window.UnityAuth.showAdminToast) {
            window.UnityAuth.showAdminToast(msg, type);
        } else if (window.showToast) {
            window.showToast(msg, type);
        } else {
            console.log(`[${type}] ${msg}`);
        }
    }

    async function dbQuery(table, params) {
        const url = `${API_URL}/${table}${params ? '?' + params : ''}`;
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) throw new Error(`Query failed: HTTP ${res.status}`);
        return await res.json();
    }

    async function getSettings() {
        const data = await dbQuery('site_settings', 'select=key,value');
        const s = {};
        data.forEach(row => { s[row.key] = row.value; });
        return s;
    }

    const AVENUES = {
        club_service: 'Club Service',
        community_service: 'Community Service',
        professional_service: 'Professional Service',
        international_service: 'International Service',
        district_priority_projects: 'District Priority Projects'
    };

    // ============================================================
    // TRY EDGE FUNCTION FIRST, FALLBACK TO CLIENT-SIDE
    // ============================================================
    async function tryEdgeFunction(payload) {
        try {
            const res = await fetch(`${EDGE_URL}/generate-docx`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ANON_KEY}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const blob = await res.blob();
                if (blob.size > 100) {
                    return blob;
                }
            }
        } catch (e) {
            console.warn('[DocxGen] Edge function unavailable, using client-side generation');
        }
        return null;
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ============================================================
    // CLIENT-SIDE DOCX GENERATION USING docx.js
    // ============================================================
    function createDocx(sections) {
        const lib = getDocx();
        if (!lib) {
            throw new Error('DOCX library not loaded. Make sure docx.js CDN is included.');
        }

        const { Document, Packer } = lib;

        const doc = new Document({
            sections: sections
        });

        return Packer.toBlob(doc);
    }

    // Safe alignment getter
    function getAlignment(type) {
        const lib = getDocx();
        if (!lib) return type || 'left';

        // Try AlignmentType enum
        if (lib.AlignmentType) {
            const map = {
                'center': lib.AlignmentType.CENTER,
                'left': lib.AlignmentType.LEFT,
                'right': lib.AlignmentType.RIGHT,
                'both': lib.AlignmentType.JUSTIFIED || lib.AlignmentType.BOTH
            };
            return map[type] || lib.AlignmentType.LEFT;
        }

        // Fallback to string
        return type || 'left';
    }

    function getBorderStyle() {
        const lib = getDocx();
        if (lib && lib.BorderStyle) return lib.BorderStyle;
        return { NONE: 'none', SINGLE: 'single' };
    }

    function getWidthType() {
        const lib = getDocx();
        if (lib && lib.WidthType) return lib.WidthType;
        return { PERCENTAGE: 'pct', DXA: 'dxa' };
    }

    function getShadingType() {
        const lib = getDocx();
        if (lib && lib.ShadingType) return lib.ShadingType;
        return { CLEAR: 'clear' };
    }

    function getUnderlineType() {
        const lib = getDocx();
        if (lib && lib.UnderlineType) return lib.UnderlineType;
        return { SINGLE: 'single' };
    }

    function inchToTwip(inches) {
        const lib = getDocx();
        if (lib && lib.convertInchesToTwip) return lib.convertInchesToTwip(inches);
        return Math.round(inches * 1440);
    }

    // ============================================================
    // BUILD PARAGRAPHS AND RUNS
    // ============================================================
    function makeParagraph(opts) {
        const lib = getDocx();
        if (!lib) throw new Error('DOCX library not loaded');

        const { Paragraph, TextRun } = lib;

        const config = {
            alignment: getAlignment(opts.alignment || 'left'),
            spacing: {
                before: opts.spaceBefore || 0,
                after: opts.spaceAfter !== undefined ? opts.spaceAfter : 120
            }
        };

        if (opts.children) {
            config.children = opts.children;
        } else if (opts.text !== undefined) {
            config.children = [
                new TextRun({
                    text: esc(opts.text),
                    bold: opts.bold || false,
                    italics: opts.italic || false,
                    size: opts.size || 22,
                    font: opts.font || 'Calibri',
                    color: opts.color ? opts.color.replace('#', '') : undefined,
                    underline: opts.underline ? { type: getUnderlineType().SINGLE } : undefined
                })
            ];
        }

        return new Paragraph(config);
    }

    function makeTextRun(opts) {
        const lib = getDocx();
        if (!lib) throw new Error('DOCX library not loaded');

        return new lib.TextRun({
            text: esc(opts.text),
            bold: opts.bold || false,
            italics: opts.italic || false,
            size: opts.size || 22,
            font: opts.font || 'Calibri',
            color: opts.color ? opts.color.replace('#', '') : undefined,
            underline: opts.underline ? { type: getUnderlineType().SINGLE } : undefined
        });
    }

    function makeDivider() {
        const lib = getDocx();
        if (!lib) throw new Error('DOCX library not loaded');

        return new lib.Paragraph({
            border: {
                bottom: {
                    color: '000000',
                    space: 1,
                    style: getBorderStyle().SINGLE,
                    size: 6
                }
            },
            spacing: { before: 120, after: 120 }
        });
    }

    function makePageBreak() {
        const lib = getDocx();
        if (!lib) throw new Error('DOCX library not loaded');

        return new lib.Paragraph({
            children: [new lib.PageBreak()]
        });
    }

    function makeEmptyParagraph() {
        const lib = getDocx();
        if (!lib) throw new Error('DOCX library not loaded');

        return new lib.Paragraph({
            spacing: { after: 120 },
            children: []
        });
    }

    // ============================================================
    // BUILD REPORT HEADER
    // ============================================================
    function buildReportHeader(s, isDPP) {
        const clubName = s.club_name || 'Rotaract Club of Coimbatore Unity';
        const clubFamily = s.club_family || 'Family of Rotary Club of Coimbatore East';
        const clubId = s.club_id || '91594';
        const group = s.club_group || '1';
        const districtShort = s.district_short || 'RI District 3206';

        return [
            makeParagraph({ text: clubName, bold: true, size: 40, alignment: 'center', spaceAfter: 60 }),
            makeParagraph({ text: clubFamily, size: 28, alignment: 'center', spaceAfter: 60 }),
            makeParagraph({
                text: `Club ID: ${clubId} | Group ${group} | ${districtShort}`,
                size: 24, alignment: 'center', spaceAfter: 120
            }),
            makeDivider()
        ];
    }

    // ============================================================
    // BUILD DETAILS TABLE
    // ============================================================
    function buildDetailsTable(details) {
        const lib = getDocx();
        if (!lib) throw new Error('DOCX library not loaded');

        const { Table, TableRow, TableCell } = lib;
        const BS = getBorderStyle();
        const WT = getWidthType();

        const noBorders = {
            top: { style: BS.NONE },
            bottom: { style: BS.NONE },
            left: { style: BS.NONE },
            right: { style: BS.NONE }
        };

        const rows = details
            .filter(d => d.value && d.value.trim())
            .map(d => new TableRow({
                children: [
                    new TableCell({
                        width: { size: 35, type: WT.PERCENTAGE },
                        borders: noBorders,
                        children: [makeParagraph({ text: d.label, bold: true, size: 20 })]
                    }),
                    new TableCell({
                        width: { size: 5, type: WT.PERCENTAGE },
                        borders: noBorders,
                        children: [makeParagraph({ text: ':', size: 20 })]
                    }),
                    new TableCell({
                        width: { size: 60, type: WT.PERCENTAGE },
                        borders: noBorders,
                        children: [makeParagraph({ text: d.value, size: 20 })]
                    })
                ]
            }));

        if (!rows.length) return makeEmptyParagraph();

        return new Table({
            width: { size: 100, type: WT.PERCENTAGE },
            borders: {
                top: { style: BS.NONE },
                bottom: { style: BS.NONE },
                left: { style: BS.NONE },
                right: { style: BS.NONE },
                insideH: { style: BS.NONE },
                insideV: { style: BS.NONE }
            },
            rows: rows
        });
    }

    // ============================================================
    // BUILD SIGNATURE BLOCK - Supports single or dual secretary
    // ============================================================
    function buildSignatureBlock(s) {
        const lib = getDocx();
        if (!lib) throw new Error('DOCX library not loaded');

        const { Table, TableRow, TableCell } = lib;
        const BS = getBorderStyle();
        const WT = getWidthType();

        const noBorders = {
            top: { style: BS.NONE },
            bottom: { style: BS.NONE },
            left: { style: BS.NONE },
            right: { style: BS.NONE }
        };

        const president = s.president_name || 'President';
        const secretaryMode = s.secretary_mode || 'dual';

        function sigCell(name, role, width) {
            return new TableCell({
                width: { size: width, type: WT.PERCENTAGE },
                borders: noBorders,
                children: [
                    makeParagraph({ text: name, bold: true, size: 20, alignment: 'center', spaceAfter: 40 }),
                    makeParagraph({ text: role, size: 18, alignment: 'center', spaceAfter: 0 })
                ]
            });
        }

        if (secretaryMode === 'single') {
            // SINGLE SECRETARY MODE - 2 columns
            const secretary = s.secretary_name || s.secretary_admin_name || 'Secretary';

            return new Table({
                width: { size: 100, type: WT.PERCENTAGE },
                borders: {
                    top: { style: BS.NONE }, bottom: { style: BS.NONE },
                    left: { style: BS.NONE }, right: { style: BS.NONE },
                    insideH: { style: BS.NONE }, insideV: { style: BS.NONE }
                },
                rows: [
                    new TableRow({
                        children: [
                            sigCell(secretary, 'Secretary', 50),
                            sigCell(president, 'President', 50)
                        ]
                    })
                ]
            });
        } else {
            // DUAL SECRETARY MODE - 3 columns (default)
            const secAdmin = s.secretary_admin_name || 'Secretary Administration';
            const secComm = s.secretary_comm_name || 'Secretary Communication';

            return new Table({
                width: { size: 100, type: WT.PERCENTAGE },
                borders: {
                    top: { style: BS.NONE }, bottom: { style: BS.NONE },
                    left: { style: BS.NONE }, right: { style: BS.NONE },
                    insideH: { style: BS.NONE }, insideV: { style: BS.NONE }
                },
                rows: [
                    new TableRow({
                        children: [
                            sigCell(secAdmin, 'Secretary Administration', 33),
                            sigCell(president, 'President', 34),
                            sigCell(secComm, 'Secretary Communication', 33)
                        ]
                    })
                ]
            });
        }
    }

    // ============================================================
    // GENERATE EVENT REPORT
    // ============================================================
    async function generateEventReport(eventId) {
        toast('Generating event report...', 'info');

        // Try edge function first
        const edgeBlob = await tryEdgeFunction({ type: 'event_report', eventId: eventId });
        if (edgeBlob) {
            downloadBlob(edgeBlob, 'Event_Report.docx');
            toast('Report downloaded!', 'success');
            return;
        }

        // Check if docx library is available
        const lib = getDocx();
        if (!lib) {
            toast('DOCX library not loaded. Please refresh the page.', 'error');
            return;
        }

        try {
            const s = await getSettings();
            const evArr = await dbQuery('projects', `select=*&id=eq.${eventId}`);
            const ev = evArr[0];
            if (!ev) throw new Error('Event not found');

            const reportsArr = await dbQuery('project_reports', `select=*&project_id=eq.${eventId}`);
            const report = reportsArr[0];

            const isDPP = ev.avenue === 'district_priority_projects';
            const avenueName = AVENUES[ev.avenue] || ev.avenue;

            // Build details
            const details = [
                { label: 'Event Name', value: ev.title },
                { label: 'Date', value: fDate(ev.event_date) },
                { label: 'Time', value: ev.event_time ? fTime(ev.event_time) + (ev.end_time ? ' - ' + fTime(ev.end_time) : '') : '' },
                { label: 'Venue', value: ev.venue || '' },
                { label: 'Avenue', value: avenueName },
                { label: 'Event Chair', value: ev.event_chair || '' },
                { label: 'Event Secretary', value: ev.event_secretary || '' },
                { label: 'Group Number', value: ev.group_number ? 'Group ' + ev.group_number : '' },
                { label: 'Proposed By', value: ev.event_proposed_by || '' },
                { label: 'Seconded By', value: ev.event_seconded_by || '' }
            ];

            if (isDPP) {
                details.push(
                    { label: 'DPP Project Number', value: ev.dpp_project_number || '' },
                    { label: 'DPP Pillar', value: ev.dpp_pillar || '' },
                    { label: 'DPP Category', value: ev.dpp_category || '' }
                );
            }

            if (ev.collaboration_type && ev.collaboration_type !== 'none') {
                details.push({
                    label: 'Collaboration',
                    value: ev.collaboration_type + (ev.collaborator_name ? ' - ' + ev.collaborator_name : '')
                });
            }

            // Build document children
            const children = [
                ...buildReportHeader(s, isDPP),
                buildDetailsTable(details),
                makeDivider(),
                makeParagraph({
                    text: 'Report',
                    bold: true,
                    size: 28,
                    underline: true,
                    alignment: 'center',
                    spaceAfter: 200
                }),
                report && report.report_text
                    ? makeParagraph({
                        text: report.report_text,
                        size: 22,
                        alignment: 'both',
                        spaceAfter: 200
                    })
                    : makeParagraph({
                        text: 'Report pending submission.',
                        size: 22,
                        italic: true
                    })
            ];

            if (report && report.attendance_count) {
                children.push(makeParagraph({
                    text: `Total Attendance: ${report.attendance_count}     Beneficiaries: ${report.beneficiaries_count || 'N/A'}`,
                    bold: true,
                    size: 20,
                    spaceAfter: 200
                }));
            }

            children.push(makeEmptyParagraph());
            children.push(makeEmptyParagraph());
            children.push(makeEmptyParagraph());
            children.push(buildSignatureBlock(s));

            const blob = await createDocx([{
                properties: {
                    page: {
                        margin: {
                            top: inchToTwip(1),
                            right: inchToTwip(1),
                            bottom: inchToTwip(1),
                            left: inchToTwip(1)
                        }
                    }
                },
                children: children
            }]);

            const filename = `${(ev.title || 'Event').replace(/[^a-z0-9]/gi, '_')}_Report.docx`;
            downloadBlob(blob, filename);
            toast('Report downloaded!', 'success');

        } catch (e) {
            console.error('[DocxGen] Error:', e);
            toast('Failed to generate report: ' + e.message, 'error');
        }
    }

    // ============================================================
    // GENERATE MONTHLY REPORT
    // ============================================================
    async function generateMonthlyReport(monthStr) {
        toast('Generating monthly report...', 'info');

        const edgeBlob = await tryEdgeFunction({ type: 'monthly_report', month: monthStr });
        if (edgeBlob) {
            downloadBlob(edgeBlob, `Monthly_Report_${monthStr}.docx`);
            toast('Monthly report downloaded!', 'success');
            return;
        }

        try {
            const s = await getSettings();
            const [yr, mo] = monthStr.split('-');
            const fromDate = `${yr}-${mo}-01`;
            const lastDay = new Date(parseInt(yr), parseInt(mo), 0).getDate();
            const toDate = `${yr}-${mo}-${lastDay}`;
            const monthLabel = new Date(parseInt(yr), parseInt(mo) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

            const events = await dbQuery('projects',
                `select=*&status=eq.completed&event_date=gte.${fromDate}&event_date=lte.${toDate}&order=event_date.asc`
            );

            if (!events.length) {
                toast('No completed events for ' + monthLabel, 'warning');
                return;
            }

            const allChildren = [];

            // Front page
            allChildren.push(...buildReportHeader(s, false));
            allChildren.push(makeParagraph({
                text: 'Monthly Report',
                bold: true, size: 48,
                alignment: 'center',
                spaceBefore: 1440, spaceAfter: 240
            }));
            allChildren.push(makeParagraph({
                text: monthLabel,
                bold: true, size: 36,
                alignment: 'center',
                spaceAfter: 1440
            }));
            allChildren.push(makeEmptyParagraph());
            allChildren.push(buildSignatureBlock(s));
            allChildren.push(makePageBreak());

            // Each event
            for (let i = 0; i < events.length; i++) {
                const ev = events[i];
                const reportsArr = await dbQuery('project_reports', `select=*&project_id=eq.${ev.id}`);
                const report = reportsArr[0];
                const isDPP = ev.avenue === 'district_priority_projects';

                allChildren.push(...buildReportHeader(s, isDPP));

                const details = [
                    { label: 'Event Name', value: ev.title },
                    { label: 'Date', value: fDate(ev.event_date) },
                    { label: 'Time', value: ev.event_time ? fTime(ev.event_time) : '' },
                    { label: 'Venue', value: ev.venue || '' },
                    { label: 'Avenue', value: AVENUES[ev.avenue] || ev.avenue },
                    { label: 'Event Chair', value: ev.event_chair || '' },
                    { label: 'Event Secretary', value: ev.event_secretary || '' }
                ];

                if (isDPP) {
                    details.push(
                        { label: 'DPP Project Number', value: ev.dpp_project_number || '' },
                        { label: 'DPP Pillar', value: ev.dpp_pillar || '' },
                        { label: 'DPP Category', value: ev.dpp_category || '' }
                    );
                }

                allChildren.push(buildDetailsTable(details));
                allChildren.push(makeDivider());
                allChildren.push(makeParagraph({
                    text: 'Report', bold: true, size: 26,
                    underline: true, alignment: 'center', spaceAfter: 160
                }));

                if (report && report.report_text) {
                    allChildren.push(makeParagraph({
                        text: report.report_text, size: 20,
                        alignment: 'both', spaceAfter: 200
                    }));
                }

                if (report && report.attendance_count) {
                    allChildren.push(makeParagraph({
                        text: `Attendance: ${report.attendance_count}     Beneficiaries: ${report.beneficiaries_count || 'N/A'}`,
                        bold: true, size: 20, spaceAfter: 160
                    }));
                }

                if (i < events.length - 1) {
                    allChildren.push(makePageBreak());
                }
            }

            allChildren.push(makeEmptyParagraph());
            allChildren.push(buildSignatureBlock(s));

            const blob = await createDocx([{
                properties: {
                    page: {
                        margin: {
                            top: inchToTwip(1), right: inchToTwip(1),
                            bottom: inchToTwip(1), left: inchToTwip(1)
                        }
                    }
                },
                children: allChildren
            }]);

            downloadBlob(blob, `Monthly_Report_${monthLabel.replace(/ /g, '_')}.docx`);
            toast('Monthly report downloaded!', 'success');

        } catch (e) {
            console.error('[DocxGen] Error:', e);
            toast('Failed: ' + e.message, 'error');
        }
    }

    // ============================================================
    // GENERATE DPP MONTHLY REPORT
    // ============================================================
    async function generateDPPMonthlyReport(monthStr) {
        toast('Generating DPP report...', 'info');

        const edgeBlob = await tryEdgeFunction({ type: 'dpp_report', month: monthStr });
        if (edgeBlob) {
            downloadBlob(edgeBlob, `DPP_Report_${monthStr}.docx`);
            toast('DPP report downloaded!', 'success');
            return;
        }

        // Fallback - same as monthly but filtered
        toast('DPP report requires edge function. Deploy: supabase functions deploy generate-docx', 'warning');
    }

    // ============================================================
    // GENERATE MEETING AGENDA
    // ============================================================
    async function generateMeetingAgenda(meetingId) {
        toast('Generating agenda...', 'info');

        const edgeBlob = await tryEdgeFunction({ type: 'meeting_agenda', meetingId: meetingId });
        if (edgeBlob) {
            downloadBlob(edgeBlob, 'Meeting_Agenda.docx');
            toast('Agenda downloaded!', 'success');
            return;
        }

        try {
            const s = await getSettings();
            const meetArr = await dbQuery('meetings', `select=*&id=eq.${meetingId}`);
            const meeting = meetArr[0];
            if (!meeting) throw new Error('Meeting not found');

            const details = [
                { label: 'Meeting Name', value: meeting.title },
                { label: 'Date', value: fDate(meeting.meeting_date) },
                { label: 'Time', value: fTime(meeting.start_time) + (meeting.end_time ? ' - ' + fTime(meeting.end_time) : '') },
                { label: 'Venue', value: meeting.venue || '' },
                { label: 'Meeting Type', value: meeting.meeting_type === 'board' ? 'Board Members Meeting' : 'General Body Meeting' }
            ];

            const children = [
                ...buildReportHeader(s, false),
                buildDetailsTable(details),
                makeDivider(),
                makeParagraph({
                    text: 'Agenda', bold: true, size: 28,
                    underline: true, alignment: 'center', spaceAfter: 240
                })
            ];

            const agenda = meeting.agenda || [];
            if (agenda.length) {
                agenda.forEach(item => {
                    children.push(makeParagraph({
                        text: '\u25CF  ' + item, size: 22, spaceAfter: 120
                    }));
                });
            } else {
                children.push(makeParagraph({
                    text: 'No agenda items added.', size: 22, italic: true
                }));
            }

            const blob = await createDocx([{
                properties: {
                    page: {
                        margin: {
                            top: inchToTwip(1), right: inchToTwip(1),
                            bottom: inchToTwip(1), left: inchToTwip(1)
                        }
                    }
                },
                children: children
            }]);

            downloadBlob(blob, `${(meeting.title || 'Meeting').replace(/[^a-z0-9]/gi, '_')}_Agenda.docx`);
            toast('Agenda downloaded!', 'success');

        } catch (e) {
            toast('Failed: ' + e.message, 'error');
        }
    }

    // ============================================================
    // GENERATE MEETING MINUTES
    // ============================================================
    async function generateMeetingMinutes(meetingId) {
        toast('Generating minutes...', 'info');

        const edgeBlob = await tryEdgeFunction({ type: 'meeting_minutes', meetingId: meetingId });
        if (edgeBlob) {
            downloadBlob(edgeBlob, 'Meeting_Minutes.docx');
            toast('Minutes downloaded!', 'success');
            return;
        }

        try {
            const s = await getSettings();
            const meetArr = await dbQuery('meetings', `select=*&id=eq.${meetingId}`);
            const meeting = meetArr[0];
            if (!meeting) throw new Error('Meeting not found');

            let duration = '';
            if (meeting.start_time && meeting.actual_end_time) {
                const [sh, sm] = meeting.start_time.split(':').map(Number);
                const [eh, em] = meeting.actual_end_time.split(':').map(Number);
                duration = `${(eh * 60 + em) - (sh * 60 + sm)} minutes`;
            }

            const details = [
                { label: 'Meeting Name', value: meeting.title },
                { label: 'Date', value: fDate(meeting.meeting_date) },
                { label: 'Start Time', value: fTime(meeting.start_time) },
                { label: 'End Time', value: meeting.actual_end_time ? fTime(meeting.actual_end_time) : '' },
                { label: 'Venue', value: meeting.venue || '' },
                { label: 'Minutes Prepared By', value: meeting.minutes_prepared_by || '' },
                { label: 'Sergeant at Arms', value: meeting.sergeant_at_arms || '' }
            ];

            const children = [
                ...buildReportHeader(s, false),
                buildDetailsTable(details),
                makeDivider(),
                makeParagraph({
                    text: 'Meeting Minutes', bold: true, size: 28,
                    underline: true, alignment: 'center', spaceAfter: 160
                }),
                makeParagraph({
                    text: fTime(meeting.start_time),
                    bold: true, size: 28,
                    alignment: 'center',
                    spaceBefore: 200, spaceAfter: 200
                })
            ];

            // Minutes content
            const minutes = meeting.minutes_content || [];
            minutes.forEach(row => {
                children.push(makeParagraph({
                    text: `${row.time ? fTime(row.time) + '  ' : ''}${row.heading || ''}`,
                    bold: true, size: 22, spaceAfter: 40
                }));
                if (row.details) {
                    children.push(makeParagraph({
                        text: row.details, size: 20, spaceAfter: 120
                    }));
                }
            });

            if (duration) {
                children.push(makeParagraph({
                    text: `Duration of the Meeting: ${duration}`,
                    bold: true, size: 22,
                    spaceBefore: 200, spaceAfter: 120
                }));
            }

            children.push(makeEmptyParagraph());
            children.push(makeEmptyParagraph());
            children.push(buildSignatureBlock(s));

            const blob = await createDocx([{
                properties: {
                    page: {
                        margin: {
                            top: inchToTwip(1), right: inchToTwip(1),
                            bottom: inchToTwip(1), left: inchToTwip(1)
                        }
                    }
                },
                children: children
            }]);

            downloadBlob(blob, `${(meeting.title || 'Meeting').replace(/[^a-z0-9]/gi, '_')}_Minutes.docx`);
            toast('Minutes downloaded!', 'success');

        } catch (e) {
            toast('Failed: ' + e.message, 'error');
        }
    }

    // ============================================================
    // GENERATE ATTENDANCE SHEET
    // ============================================================
    async function generateAttendanceSheet(meetingId) {
        toast('Generating attendance...', 'info');

        const edgeBlob = await tryEdgeFunction({ type: 'attendance_sheet', meetingId: meetingId });
        if (edgeBlob) {
            downloadBlob(edgeBlob, 'Attendance_Sheet.docx');
            toast('Attendance downloaded!', 'success');
            return;
        }

        toast('Attendance sheet requires edge function. Deploy: supabase functions deploy generate-docx', 'warning');
    }

    // ============================================================
    // EXPOSE GLOBALLY
    // ============================================================
    window.DocxGenerator = {
        generateEventReport,
        generateMonthlyReport,
        generateDPPMonthlyReport,
        generateMeetingAgenda,
        generateMeetingMinutes,
        generateAttendanceSheet
    };

    console.log('%c [DocxGenerator] v4.0 loaded ', 'background:#1a56db;color:#fff;font-weight:700;padding:2px 8px;border-radius:4px;');

})();