import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';

interface Employee {
  employeeCode: string;
  startTime: string;
  endTime: string;
}

interface ProcessedEmployee {
  employeeCode: string;
  startTime: number;
  endTime: number;
}

interface EmployeeSchedule {
  employeeCode: string;
  startTime: string;
  endTime: string;
}

interface Group {
  groupName: string;
  employees: Employee[];
  data: EmployeeSchedule[][];
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  minTime = 5;
  maxTime = 21;
  pendingChanges: EmployeeSchedule[] = [];
  groups: Group[] = [
    {
      groupName: 'Group 1',
      employees: [
        { employeeCode: 'E0', startTime: '8:00', endTime: '17:00' },
        { employeeCode: 'E1', startTime: '8:00', endTime: '11:00' },
        { employeeCode: 'E2', startTime: '10:00', endTime: '16:00' }
      ],
      data: []
    },
    {
      groupName: 'Group 2',
      employees: [
        { employeeCode: 'E3', startTime: '9:00', endTime: '18:00' },
        { employeeCode: 'E4', startTime: '7:00', endTime: '15:00' },
        { employeeCode: 'E5', startTime: '11:00', endTime: '19:00' }
      ],
      data: []
    }
  ];

  constructor() { }

  ngOnInit(): void {
    this.processData();
    this.drawChart();
  }

  processData(): void {
    this.groups.forEach(group => {
      const processedEmployees = group.employees.map(emp => ({
        employeeCode: emp.employeeCode,
        startTime: emp.startTime.split(':').reduce((h, m) => (Number(h) * 60 + Number(m)).toString()),
        endTime: emp.endTime.split(':').reduce((h, m) => (Number(h) * 60 + Number(m)).toString()),
      }));

      processedEmployees.sort((a: any, b: any) => a.startTime - b.startTime || a.endTime - b.endTime);

      const lines: ProcessedEmployee[][] = [];
      for (const emp of processedEmployees) {
        const line = lines.find((line: any) => line[line.length - 1].endTime <= emp.startTime);
        if (line) {
          line.push({
            employeeCode: emp.employeeCode,
            startTime: Number(emp.startTime),
            endTime: Number(emp.endTime),
          });
        } else {
          lines.push([{
            employeeCode: emp.employeeCode,
            startTime: Number(emp.startTime),
            endTime: Number(emp.endTime),
          }]);
        }
      }

      group.data = lines.map(line =>
        line.map(emp => ({
          employeeCode: emp.employeeCode,
          startTime: `${Math.floor(emp.startTime / 60)}:${emp.startTime % 60 === 0 ? '00' : (emp.startTime % 60).toString()}`,
          endTime: `${Math.floor(emp.endTime / 60)}:${emp.endTime % 60 === 0 ? '00' : (emp.endTime % 60).toString()}`,
        }))
      );
    });
  }

  updateData(draggedBlock: EmployeeSchedule): void {
    this.pendingChanges.push(draggedBlock);
  }

  saveChanges(): void {
    this.pendingChanges.forEach(change => {
      this.groups.forEach(group => {
        group.employees = group.data.flat().map(emp => ({
          employeeCode: emp.employeeCode,
          startTime: `${Math.floor(parseInt(emp.startTime.split(':')[0]))}:${emp.startTime.split(':')[1]}`,
          endTime: `${Math.floor(parseInt(emp.endTime.split(':')[0]))}:${emp.endTime.split(':')[1]}`
        }));
      });
      this.processData();
    });

    this.pendingChanges = [];
    this.drawChart();
  }

  drawChart(): void {
    d3.select("#chart").html("");
    d3.select("#chart").style("display", "block");

    const boxWidth = 60; // Increase the box width
    const boxHeight = 40; // Increase the box height

    const chartContainer = d3.select("#chart")
      .append("svg")
      .attr("width", (this.maxTime - this.minTime) * boxWidth + 150) // Extra width for labels and group names
      .attr("height", this.groups.reduce((acc, group) => acc + group.data.length, 0) * boxHeight + this.groups.length * 70 + 50); // Adjust height to fit all groups

    // Add a header for the time labels
    const headerGroup = chartContainer.append("g")
      .attr("transform", "translate(150, 0)");

    headerGroup.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", (this.maxTime - this.minTime) * boxWidth)
      .attr("height", boxHeight)
      .attr("fill", "lightgray")
      .attr("stroke", "black");

    // Add time labels with borders
    for (let i = this.minTime; i <= this.maxTime; i++) {
      headerGroup.append("text")
        .attr("x", (i - this.minTime) * boxWidth + boxWidth / 2)
        .attr("y", boxHeight / 2 + 5)
        .attr("text-anchor", "middle")
        .text(`${i}:00`);

      headerGroup.append("line")
        .attr("x1", (i - this.minTime) * boxWidth)
        .attr("y1", 0)
        .attr("x2", (i - this.minTime) * boxWidth)
        .attr("y2", boxHeight)
        .attr("stroke", "black")
        .attr("stroke-width", 1);
    }

    let currentY = boxHeight; // Start position for the first group

    this.groups.forEach(group => {
      // Create a class name that is a valid CSS selector
      const groupClass = group.groupName.replace(/\s+/g, '_');

      // Add group name with border
      chartContainer.append("rect")
        .attr("x", 0)
        .attr("y", currentY)
        .attr("width", 150)
        .attr("height", group.data.length * boxHeight)
        .attr("fill", "none")
        .attr("stroke", "black");

      chartContainer.append("text")
        .attr("x", 75)
        .attr("y", currentY + (group.data.length * boxHeight) / 2) // Center the group name vertically
        .text(group.groupName)
        .attr("font-family", "sans-serif")
        .attr("font-size", "20px")
        .attr("fill", "black")
        .attr("text-anchor", "middle");

      // Add vertical lines
      for (let i = this.minTime; i <= this.maxTime; i++) {
        chartContainer.append("line")
          .attr("x1", (i - this.minTime) * boxWidth + 150)
          .attr("y1", currentY)
          .attr("x2", (i - this.minTime) * boxWidth + 150)
          .attr("y2", currentY + group.data.length * boxHeight)
          .attr("stroke", "black")
          .attr("stroke-width", 1);
      }

      // Add horizontal lines
      for (let i = 0; i <= group.data.length; i++) {
        chartContainer.append("line")
          .attr("x1", 150)
          .attr("y1", currentY + i * boxHeight)
          .attr("x2", (this.maxTime - this.minTime) * boxWidth + 150)
          .attr("y2", currentY + i * boxHeight)
          .attr("stroke", "black")
          .attr("stroke-width", 1);
      }

      const rows = chartContainer.selectAll(`g.${groupClass}`)
        .data(group.data)
        .enter().append("g")
        .attr("class", groupClass)
        .attr("transform", (d, i) => `translate(150,${currentY + i * boxHeight})`);

      rows.each((rowData, i, nodes) => {
        const row = d3.select(nodes[i]);
        const rects = row.selectAll("rect")
          .data(rowData)
          .enter().append("rect")
          .attr("x", d => (parseInt(d.startTime.split(':')[0]) - this.minTime) * boxWidth)
          .attr("width", d => (parseInt(d.endTime.split(':')[0]) - parseInt(d.startTime.split(':')[0])) * boxWidth)
          .attr("height", boxHeight - 10)
          .attr("fill", "steelblue");

        const texts = row.selectAll("text")
          .data(rowData)
          .enter().append("text")
          .attr("x", d => (parseInt(d.startTime.split(':')[0]) - this.minTime) * boxWidth + 5)
          .attr("y", boxHeight / 2)
          .text(d => d.employeeCode);

        const self = this;

        rects.call(d3.drag<SVGRectElement, EmployeeSchedule>()
          .on("start", function (event: any) {
            d3.select(this).raise().classed("active", true);
          })
          .on("drag", function (event: any, d: EmployeeSchedule) {
            const x = event.x;
            const width = parseInt(d3.select(this).attr("width") || '0');
            const startX = parseInt(d3.select(this).attr("x") || '0');
            const endX = startX + width;

            if (Math.abs(x - startX) < Math.abs(x - endX)) {
              const newStart = Math.max(0, Math.min(endX, x));
              d3.select(this).attr("x", newStart);
              d3.select(this).attr("width", endX - newStart);
              d.startTime = `${Math.floor(newStart / boxWidth) + self.minTime}:00`;
              row.selectAll("text").filter((t: any) => t.employeeCode === d.employeeCode)
                .attr("x", newStart + 5);
            } else {
              const newEnd = Math.max(startX, Math.min(800, x));
              d3.select(this).attr("width", newEnd - startX);
              d.endTime = `${Math.floor(newEnd / boxWidth) + self.minTime}:00`;
              row.selectAll("text").filter((t: any) => t.employeeCode === d.employeeCode)
                .attr("x", startX + 5);
            }
          })
          .on("end", function (event: any, d: EmployeeSchedule) {
            d3.select(this).classed("active", false);
            self.updateData(d);
          })
        );
      });

      currentY += group.data.length * boxHeight + 20; // Move down for the next group
    });
  }
}
